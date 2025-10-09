# Feature Update: Persistent Filters & Canvas Management

## New Features

### 1. Persistent Global Filters ✅

All universal filters now persist across page reloads, just like view settings.

**What's Saved:**
- Search text
- Project filter selection
- Person filter selection
- Status filter selection
- Due Today checkbox state
- Overdue checkbox state
- Show Archived checkbox state

**How It Works:**
```javascript
// Saved to store.current.globalFilters
{
  search: 'meeting',
  project: 'proj_123',
  person: 'person_456',
  status: 'in-progress',
  dueToday: false,
  overdue: true,
  showArchived: false
}
```

**User Experience:**
- Set your filters
- Reload the page
- All filters are exactly as you left them
- Works across browser sessions

---

### 2. Create Canvas from Visible Todos 📌

New button in the **Todos View** toolbar that creates a canvas from currently filtered/visible todos.

**Location:** Todos view → Toolbar → "📌 Create Canvas" button

**Behavior:**
1. Click "📌 Create Canvas" button
2. Enter a name for the canvas (defaults to "Filtered Todos")
3. All currently visible todos (after filters) are added to a new canvas
4. Todos are arranged in a grid layout automatically
5. You're immediately switched to the Canvas view with your new canvas selected

**Use Cases:**
- Filter todos by project → Create canvas for project planning
- Filter by "Due Today" → Create canvas for daily standup
- Filter by person → Create canvas for 1-on-1 meeting
- Filter by status "review" → Create canvas for review board

**Layout:**
- Todos arranged in a grid (square-ish shape)
- 300px horizontal spacing
- 200px vertical spacing
- Starting position: (50, 50)

**Example Workflow:**
```
1. Set filters: Project = "Q4 Launch", Status = "in-progress"
2. See 12 todos in the list
3. Click "📌 Create Canvas"
4. Name it "Q4 Launch Sprint"
5. Canvas created with all 12 todos in a 4×3 grid
6. Automatically switch to canvas view
```

---

### 3. Delete Canvas Views 🗑️

Canvas views can now be deleted (except the default canvas).

**Location:** Canvas view → Toolbar → Delete button (🗑️)

**Features:**
- Delete button **only visible** for non-default canvases
- Automatically hidden when viewing "Default Canvas"
- Shows when viewing any custom canvas
- Confirmation dialog before deletion
- After deletion, automatically switches back to default canvas

**Protection:**
- Cannot delete "Default Canvas"
- Attempting to delete default shows: "Cannot delete the default canvas"
- All other canvases can be deleted without restriction

**Visual Indicator:**
- Delete button styled with red background (`var(--bad)`)
- White icon (🗑️) for high visibility
- Position: Between canvas selector and todo add button

**User Experience:**
```
Before: [Canvas Select ▼] [➕] [📌] [📁] ...
After:  [Canvas Select ▼] [➕] [🗑️] [📌] [📁] ...
                              ↑
                    (only shows for custom canvases)
```

---

## Implementation Details

### Data Structure

**Global Filters Storage:**
```javascript
store.current.globalFilters = {
  search: '',
  project: '',
  person: '',
  status: '',
  dueToday: false,
  overdue: false,
  showArchived: false
}
```

**Canvas Views:**
```javascript
store.canvasViews = {
  'default': {
    id: 'default',
    name: 'Default Canvas',
    entities: { 'todo:1': {x: 100, y: 100}, ... }
  },
  'canvas_1234567890': {
    id: 'canvas_1234567890',
    name: 'Filtered Todos',
    entities: { 'todo:5': {x: 50, y: 50}, ... }
  }
}
```

### Key Functions

**Save Global Filters:**
```javascript
function saveGlobalFilters() {
  store.current.globalFilters = {
    search: globalSearch.value,
    project: globalProject.value,
    person: globalPerson.value,
    status: globalStatus.value,
    dueToday: globalDueToday.checked,
    overdue: globalOverdue.checked,
    showArchived: globalShowArchived.checked
  };
  save();
}
```

**Restore Global Filters:**
```javascript
function restoreGlobalFilters() {
  if (!store.current?.globalFilters) return;
  
  const gf = store.current.globalFilters;
  globalSearch.value = gf.search || '';
  globalProject.value = gf.project || '';
  // ... etc
}
```

**Create Canvas from Todos:**
```javascript
el('#btnCreateCanvasFromTodos').addEventListener('click', () => {
  const visibleTodos = [...viewData.todos]; // Use filtered data
  const id = 'canvas_' + Date.now();
  
  // Arrange in grid
  const cols = Math.ceil(Math.sqrt(visibleTodos.length));
  const entities = {};
  visibleTodos.forEach((todo, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    entities[`todo:${todo.id}`] = {
      x: col * 300 + 50,
      y: row * 200 + 50
    };
  });
  
  store.canvasViews[id] = { id, name, entities };
  setTab('canvas');
});
```

**Delete Canvas:**
```javascript
el('#btnDeleteCanvasView').addEventListener('click', () => {
  if (currentCanvasView === 'default') {
    alert('Cannot delete the default canvas');
    return;
  }
  
  if (!confirm(`Delete canvas "${view.name}"?`)) return;
  
  delete store.canvasViews[currentCanvasView];
  currentCanvasView = 'default';
  save();
  renderCanvas();
});
```

### Auto-Update Delete Button

The delete button visibility is managed automatically:

```javascript
function updateCanvasViewSelector() {
  // ... populate selector ...
  
  const deleteBtn = el('#btnDeleteCanvasView');
  if (deleteBtn) {
    deleteBtn.style.display = currentCanvasView === 'default' ? 'none' : 'grid';
  }
}
```

Also updates when user changes canvas in dropdown:

```javascript
el('#canvasViewSelect').addEventListener('change', (e) => {
  currentCanvasView = e.target.value;
  
  // Update delete button visibility
  const deleteBtn = el('#btnDeleteCanvasView');
  if (deleteBtn) {
    deleteBtn.style.display = currentCanvasView === 'default' ? 'none' : 'grid';
  }
  
  renderCanvas();
});
```

---

## Benefits

### Persistent Filters
✅ **No more losing your filter state** on page reload  
✅ **Consistent experience** across sessions  
✅ **Faster workflow** - don't re-apply filters every time  
✅ **Better for focused work** - maintain context  

### Create Canvas from Filtered Todos
✅ **Visual planning** - turn any filter into a canvas  
✅ **Meeting preparation** - create boards for specific contexts  
✅ **Quick organization** - instant visual layout from any filter  
✅ **Flexible workflows** - combine filtering power with canvas visualization  

### Delete Canvas Views
✅ **Clean workspace** - remove canvases you no longer need  
✅ **Safe default** - can't accidentally delete the default canvas  
✅ **Better organization** - keep only relevant canvases  
✅ **Clear UI** - delete button only shows when applicable  

---

## User Workflows

### Workflow 1: Daily Standup Canvas
```
1. Set filters: Due Today ✓, Status = in-progress
2. See 8 todos due today
3. Click "📌 Create Canvas" → "Daily Standup"
4. Canvas created with 8 todos in 3×3 grid
5. Use in standup meeting
6. After meeting: Delete canvas (temporary view)
```

### Workflow 2: Project Planning
```
1. Set filter: Project = "Website Redesign"
2. See all 25 todos for the project
3. Click "📌 Create Canvas" → "Website Redesign Board"
4. Arrange and organize visually
5. Keep canvas for ongoing project tracking
6. When project done: Delete canvas
```

### Workflow 3: Person-Specific View
```
1. Set filter: Person = "Alice"
2. See all 12 tasks assigned to Alice
3. Click "📌 Create Canvas" → "Alice 1-on-1"
4. Use for 1-on-1 meeting discussion
5. After meeting: Delete canvas
```

---

## Technical Notes

### Backwards Compatibility
- Existing data automatically upgraded with `store.current.globalFilters`
- No data loss on upgrade
- Works with existing canvas system

### Performance
- Filter state saved on every change (fast, minimal data)
- Canvas creation is instant (even for 50+ todos)
- Delete operation is immediate

### Edge Cases Handled
- ✅ No todos visible → Alert user before creating empty canvas
- ✅ Default canvas delete attempt → Show error message
- ✅ Canvas deleted while viewing → Auto-switch to default
- ✅ Page reload → All filters restored exactly

---

## Summary

Three powerful new features that enhance the dashboard:

1. **Persistent Filters** - Your filter settings stick around
2. **Create Canvas from Todos** - Turn any filtered view into a visual canvas
3. **Delete Canvas Views** - Clean up temporary or unused canvases

All features work together seamlessly with the existing single-source-of-truth architecture! 🎉
