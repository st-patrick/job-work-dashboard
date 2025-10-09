# Job Work Dashboard - Data Architecture

## Overview
The application now uses a **single source of truth** architecture with centralized data filtering and a universal view interface.

## Core Concepts

### 1. Single Source of Truth (STATUS_DEFINITIONS)
```javascript
const STATUS_DEFINITIONS = [
  { id: 'todo', label: 'Todo', order: 0 },
  { id: 'in-progress', label: 'In Progress', order: 1 },
  { id: 'waiting', label: 'Waiting', order: 2 },
  { id: 'review', label: 'Review', order: 3 },
  { id: 'done', label: 'Done', order: 4 }
];
```

All status-related logic derives from this single definition. No more hardcoded statuses scattered throughout the code.

### 2. Universal View Data Object
```javascript
const viewData = {
  todos: [],        // Filtered/sorted todos
  projects: [],     // Filtered/sorted projects
  people: [],       // Filtered/sorted people
  statuses: [],     // Available statuses (from STATUS_DEFINITIONS)
  projectsMap: {},  // Map of projectId -> project
  peopleMap: {}     // Map of personId -> person
};
```

This object contains **pre-filtered data** that all views consume. It's computed once per render cycle.

### 3. Data Flow

```
store (raw data)
    ↓
computeViewData() ← applies global filters
    ↓
viewData (filtered data) ← single source
    ↓
    ├→ renderMainTodos() ← applies view-specific sorting
    ├→ renderProjects()
    ├→ renderPeople()
    └→ renderKanban()
```

## Universal Filters

All views respect these global filters:
- **Search** - Searches titles, descriptions, project names, people names
- **Project** - Filters todos by project
- **Person** - Filters todos by assigned person
- **Status** - Filters todos by status (todo, in-progress, waiting, review, done)
- **Due Today** - Shows only items due today
- **Overdue** - Shows only overdue items
- **Show Archived** - Include/exclude archived items (hidden by default)

### Filter Behavior
- Filters are applied **once** in `computeViewData()`
- All views consume the same filtered data from `viewData`
- Individual views can add their own sorting or display logic
- No duplicate filtering logic per view

## Benefits

### 1. Performance
- Filter logic runs **once** per render cycle, not per view
- Reduced redundant filtering and data processing

### 2. Consistency
- All views see the same filtered data
- No possibility of views showing contradictory data
- Single place to debug filter logic

### 3. Maintainability
- Statuses defined in one place (`STATUS_DEFINITIONS`)
- Projects and people dropdowns automatically populated
- Easy to add new filters or modify existing ones

### 4. Extensibility
- Views can add their own sorting without re-filtering
- Easy to add new views that consume `viewData`
- Simple to add computed fields to `viewData`

## View-Specific Logic

### Todos View
- Only has **Sort** filter (all other filters are universal)
- Applies sorting to `viewData.todos`
- No longer has duplicate search/project/person/archived filters

### Projects View
- Shows filtered projects from `viewData.projects`
- Shows only todos that exist in `viewData.todos`
- Click project card → switches to todos view with project filter

### People View
- Shows filtered people from `viewData.people`
- Only shows waiting tasks that exist in `viewData.todos`
- Sorted by task count (most tasks first, no tasks last)

### Kanban View
- Default board uses `STATUS_DEFINITIONS` for columns
- Uses `viewData.todos` with optional board-specific project filter
- Custom boards filter by column membership from `viewData.todos`

## Render Cycle

```javascript
function render(full = false) {
  // 1. Update UI state
  updateActiveTab();
  
  // 2. Update filter dropdowns
  updateGlobalFilters();
  
  // 3. Compute filtered view data (SINGLE SOURCE)
  computeViewData();
  
  // 4. Render active view (uses viewData)
  switch (currentTab) {
    case 'todos': renderMainTodos(); break;
    case 'projects': renderProjects(); break;
    case 'people': renderPeople(); break;
    case 'kanban': renderKanban(); break;
  }
}
```

## Migration Notes

### What Changed
- ❌ Removed per-view search/project/person filters
- ❌ Removed "Show Archived" from todos view
- ✅ Added universal filter bar
- ✅ Added `computeViewData()` function
- ✅ Added `STATUS_DEFINITIONS` constant
- ✅ Views now read from `viewData` instead of `store` directly

### What Stayed the Same
- Store structure unchanged (backwards compatible)
- All views still work as before
- User data is preserved
- No breaking changes to localStorage format

## Future Enhancements

### Easy to Add
1. **New filters** - Add to `computeViewData()` and filter bar HTML
2. **New views** - Just consume `viewData` and apply view-specific logic
3. **Computed fields** - Add to `viewData` (e.g., task counts, overdue flags)
4. **Performance metrics** - Track filter performance in `computeViewData()`

### Examples

**Add "High Priority" filter:**
```javascript
// In computeViewData()
if (globalHighPriority.checked) {
  todos = todos.filter(t => t.eisen?.important || t.eisen?.urgent);
}
```

**Add "Recent" view:**
```javascript
function renderRecent() {
  // Use viewData, sort by created date
  const recent = [...viewData.todos]
    .sort((a, b) => (b.created || 0) - (a.created || 0))
    .slice(0, 20);
  
  // Render recent todos
}
```

## Best Practices

### ✅ DO
- Read from `viewData` in render functions
- Add filters to `computeViewData()`
- Use `STATUS_DEFINITIONS` for status logic
- Keep view-specific sorting in views

### ❌ DON'T
- Filter `store.todos` directly in views
- Hardcode status values
- Duplicate filter logic across views
- Modify `viewData` (read-only)

## Summary

The new architecture provides:
- **Single source of truth** for statuses and derived data
- **Universal filtering** applied once per render
- **Clean separation** between data (store), filtered data (viewData), and presentation (views)
- **Better performance** through reduced duplicate processing
- **Easier maintenance** with centralized filter logic
