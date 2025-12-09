/*** ====== DATA ====== ***/
const LS_KEY='jwdm_v1';
const demoData=()=>({
  meta:{version:3,lastId:100},
  current:{
    tab:'todos',
    sort:'due-asc',
    activeKanbanId:'default',
    filters:{
      search:'',
      project:'',
      person:'',
      sort:'due-asc'
    }
  },
  todos:{
    1:{id:'1',title:'Finalize wireframes',notes:'Homepage + pricing',projectId:'p1',people:[],tags:['design'],due:dateStrOffset(2),created:Date.now()-86400000*2,status:'in-progress',eisen:{impact:1,important:1,urgent:0}},
    2:{id:'2',title:'API auth flow',notes:'Add refresh tokens',projectId:'p1',people:['a'],tags:['api','security'],due:dateStrOffset(5),created:Date.now()-86400000*3,status:'todo',eisen:{impact:1,important:0,urgent:1}},
    3:{id:'3',title:'Client feedback pass',notes:'Summarize and triage',projectId:'p2',people:['b'],tags:['pm'],due:dateStrOffset(1),created:Date.now()-86400000,status:'review',eisen:{impact:1,important:1,urgent:1}},
    4:{id:'4',title:'Billing bugfix',notes:'Rounding issue',projectId:'p1',people:['c'],tags:['bug'],due:dateStrOffset(0),created:Date.now()-3600*1000,status:'in-progress',eisen:{impact:1,important:0,urgent:1}},
    5:{id:'5',title:'Write release notes',notes:'',projectId:'p2',people:[],tags:['docs'],due:'',created:Date.now(),status:'todo',eisen:{impact:1,important:0,urgent:0}}
  },
  projects:{ p1:{id:'p1',name:'LaunchPad',color:'#7cc9ff',todoIds:['1','2','4']}, p2:{id:'p2',name:'Client Alpha',color:'#ffd36b',todoIds:['3','5']} },
  people:{
    a:{id:'a',name:'Alex',initials:'AX',waitingForMe:['2'],waitingForThem:['3'],projects:['p1']},
    b:{id:'b',name:'Bea',initials:'BE',waitingForMe:['3'],waitingForThem:[],projects:['p2']},
    c:{id:'c',name:'Chris',initials:'CH',waitingForMe:['4'],waitingForThem:[],projects:['p1','p2']}
  },
  kanbans:{
    kb1:{id:'kb1',name:'Default',columns:[
      {id:'col-backlog',name:'Backlog',todoIds:['5']},
      {id:'col-progress',name:'In Progress',todoIds:['1','4']},
      {id:'col-review',name:'Review',todoIds:['3']},
      {id:'col-done',name:'Done',todoIds:[]}
    ]}
  },
  canvasViews:{
    default:{
      id:'default',
      name:'Default Canvas',
      entities:{
        // Per-view positioning: entityType:entityId -> {x, y}
        // Example: 'todo:1': {x: 150, y: 200}
      }
    }
  }
});
function dateStrOffset(days){const d=new Date(Date.now()+days*86400000);return d.toISOString().slice(0,10);} 

// ====== SINGLE SOURCE OF TRUTH ======
// These objects are derived from store data and provide a universal interface

const STATUS_DEFINITIONS = [
  { id: 'todo', label: 'Todo', order: 0 },
  { id: 'in-progress', label: 'In Progress', order: 1 },
  { id: 'waiting', label: 'Waiting', order: 2 },
  { id: 'review', label: 'Review', order: 3 },
  { id: 'done', label: 'Done', order: 4 }
];

// Universal computed data - this is what views consume
// Contains filtered and sorted data based on global filters
const viewData = {
  todos: [],        // Filtered/sorted todos
  projects: [],     // Filtered/sorted projects
  people: [],       // Filtered/sorted people
  statuses: [],     // Available statuses (derived from STATUS_DEFINITIONS)
  projectsMap: {},  // Map of projectId -> project
  peopleMap: {},    // Map of personId -> person
  todoWaitingOn: new Set(),    // Todo IDs where we wait on others
  todoWaitingOnMe: new Set()   // Todo IDs where others wait on us
};

let store=load();
function load(){try{const raw=localStorage.getItem(LS_KEY);if(!raw){const d=demoData();localStorage.setItem(LS_KEY,JSON.stringify(d));return structuredClone(d);}
  const data = JSON.parse(raw);
  // Ensure backwards compatibility for view state
  if (!data.current) data.current = {};
  if (!data.current.filters) data.current.filters = {sort:'due-asc'};
  if (!data.current.globalFilters) data.current.globalFilters = {
    search: '', project: '', person: '', status: '', 
    dueToday: false, overdue: false, showArchived: false
  };
  if (!data.canvasViews) data.canvasViews = {
    default: { id: 'default', name: 'Default Canvas', entities: {} }
  };
  return data;
}catch(e){
  console.error('Failed to load data:', e);
  // Create backup before overwriting
  const backup = localStorage.getItem(LS_KEY);
  if(backup) {
    const backupKey = LS_KEY + '_backup_' + Date.now();
    localStorage.setItem(backupKey, backup);
    console.warn('Corrupted data backed up to:', backupKey);
    alert('⚠️ Data load error! A backup was saved. Check console and export your data immediately.');
  }
  const d=demoData();
  localStorage.setItem(LS_KEY,JSON.stringify(d));
  return structuredClone(d);
}}
function save(){
  const timestamp = new Date().toISOString();
  const dataToSave = {...store, _lastSaved: timestamp, _saveCount: (store._saveCount || 0) + 1};
  localStorage.setItem(LS_KEY, JSON.stringify(dataToSave));
  
  // Log saves for debugging
  if(window.DEBUG_SAVES) {
    console.log(`[${timestamp}] Save #${dataToSave._saveCount} - Todos: ${Object.keys(store.todos).length}, Projects: ${Object.keys(store.projects).length}`);
  }
  
  // Auto-backup every 10 saves
  if(!window._saveCount) window._saveCount = 0;
  window._saveCount++;
  if(window._saveCount % 10 === 0) {
    const backupKey = LS_KEY + '_autobackup';
    localStorage.setItem(backupKey, JSON.stringify(dataToSave));
    console.log('Auto-backup saved at', timestamp);
  }
}

// Enable save debugging from console
window.debugSaves = function(enabled = true) {
  window.DEBUG_SAVES = enabled;
  console.log('Save debugging:', enabled ? 'enabled' : 'disabled');
};

// Show current data timestamp info
window.checkDataVersion = function() {
  console.log('=== Current Data Version ===');
  console.log('Save count:', store._saveCount || 'unknown');
  console.log('Last saved:', store._lastSaved || 'unknown');
  console.log('Todos:', Object.keys(store.todos).length);
  console.log('Projects:', Object.keys(store.projects).length);
  console.log('People:', Object.keys(store.people).length);
  console.log('\nTo see all backups: listBackups()');
};
function nextId(){store.meta.lastId++;return String(store.meta.lastId);} 

// Save and restore view state (now only sort remains in todos view)
function saveViewState() {
  if (!store.current) store.current = {};
  if (!store.current.filters) store.current.filters = {};
  
  store.current.filters = {
    sort: fSort?.value || 'due-asc'
  };
  save();
}

function restoreViewState() {
  if (!store.current?.filters) return;
  
  // Safety check - make sure filter elements exist
  if (!fSort) return;
  
  const filters = store.current.filters;
  if (filters.sort !== undefined) fSort.value = filters.sort;
}

function commitActiveInlineEdits() {
  const active = document.activeElement;
  if (!active || !active.dataset) return;
  const { act } = active.dataset;

  if (act === 'editTitle') {
    const id = active.dataset.id;
    const todo = id ? store.todos[id] : null;
    if (!todo) return;
    const nextTitle = active.textContent.trim();
    if (!nextTitle) {
      active.textContent = todo.title || '';
      active.setAttribute('title', todo.title || '');
      setTitleEditingState(active, false);
      applyTitleOverflowState(active, todo.title || '');
      return;
    }
    if (nextTitle !== todo.title) {
      todo.title = nextTitle;
      save();
    }
    active.textContent = todo.title || '';
    active.setAttribute('title', todo.title || '');
    setTitleEditingState(active, false);
    applyTitleOverflowState(active, todo.title || '');
  } else if (act === 'editProjectName') {
    const projectId = active.dataset.pid;
    const project = projectId ? store.projects[projectId] : null;
    if (!project) return;
    const nextName = active.textContent.trim();
    if (!nextName) {
      active.textContent = project.name || '';
      return;
    }
    if (nextName !== project.name) {
      project.name = nextName;
      save();
    }
  } else if (act === 'renameCol') {
    const board = store.kanbans[store.current.activeKanbanId];
    if (!board) return;
    const colId = active.dataset.col;
    const column = board.columns?.find(c => c.id === colId);
    if (!column) return;
    const nextLabel = active.textContent.trim();
    if (!nextLabel) {
      active.textContent = column.name || '';
      return;
    }
    if (nextLabel !== column.name) {
      column.name = nextLabel;
      save();
    }
  }
}
  

function deleteTodo(id) {
  if (!id || !store.todos[id]) return false;
  
  // Remove from todos
  delete store.todos[id];
  
  // Remove from projects
  Object.values(store.projects).forEach(p => {
    if (p.todoIds?.includes(id)) {
      p.todoIds = p.todoIds.filter(tid => tid !== id);
    }
  });
  
  // Remove from people waiting lists
  Object.values(store.people).forEach(p => {
    if (p.waitingForMe?.includes(id)) {
      p.waitingForMe = p.waitingForMe.filter(tid => tid !== id);
    }
    if (p.waitingForThem?.includes(id)) {
      p.waitingForThem = p.waitingForThem.filter(tid => tid !== id);
    }
  });
  
  // Remove from kanban columns
  Object.values(store.kanbans).forEach(kb => {
    kb.columns.forEach(col => {
      if (col.todoIds?.includes(id)) {
        col.todoIds = col.todoIds.filter(tid => tid !== id);
      }
    });
  });
  
  save();
  return true;
}

/*** ====== HELPERS ====== ***/
const el=(q,r=document)=>r.querySelector(q), els=(q,r=document)=>Array.from(r.querySelectorAll(q));
function fmtDue(d){if(!d) return '—';const diff=(new Date(d)-new Date().setHours(0,0,0,0))/86400000;const days=Math.round(diff);
  if(days<0) return `⚠ ${Math.abs(days)}d overdue`; if(days===0) return 'Today'; if(days===1) return 'Tomorrow'; return `in ${days}d`; }
const pColor=p=> '#'+(p.initials.charCodeAt(0)*99991 % 0xffffff).toString(16).padStart(6,'6f6f6f');
const score=t=> (t.eisen?.impact?4:0)+(t.eisen?.important?2:0)+(t.eisen?.urgent?1:0);
const projName= t=> store.projects[t.projectId]?.name || '';
const universalHaystack=t=>{
  const people=(t.people||[]).map(id=>store.people[id]?.name).filter(Boolean).join(' ');
  return [t.title,t.notes,(t.tags||[]).join(' '),t.status,score(t),t.id,t.due,projName(t),people].join(' ').toLowerCase();
};
const TITLE_MAX_LEN = 80;
const DURATION_FACTORS = { minutes: 1, hours: 60, days: 1440 };
const escapeHtml = str=>String(str??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]||c));
function setTitleEditingState(target, editing){
  const cell = target?.closest?.('.title-cell');
  if(!cell) return;
  cell.classList.toggle('editing', !!editing);
}
function applyTitleOverflowState(target, fullTitle=''){
  const cell = target?.closest?.('.title-cell');
  if(!cell) return;
  const isLong = fullTitle.trim().length > TITLE_MAX_LEN;
  cell.classList.toggle('has-long-title', isLong);
}
function normalizeDurationInput(valueStr, unit='minutes'){
  if(valueStr==='' || valueStr===null || valueStr===undefined) return null;
  const numeric = Number.parseFloat(valueStr);
  if(!Number.isFinite(numeric) || numeric < 0) return null;
  const factor = DURATION_FACTORS[unit] || 1;
  const minutes = Math.round(numeric * factor);
  return minutes > 0 ? minutes : null;
}
function bestDurationUnit(minutes){
  if(!minutes || minutes <= 0) return { value: '', unit: 'minutes' };
  if(minutes % DURATION_FACTORS.days === 0) return { value: minutes / DURATION_FACTORS.days, unit: 'days' };
  if(minutes % DURATION_FACTORS.hours === 0) return { value: minutes / DURATION_FACTORS.hours, unit: 'hours' };
  return { value: minutes, unit: 'minutes' };
}
function formatDuration(minutes){
  const total = Number(minutes) || 0;
  if(total <= 0) return '';
  const parts = [];
  let remaining = total;
  const days = Math.floor(remaining / DURATION_FACTORS.days);
  if(days){
    parts.push(`${days}d`);
    remaining -= days * DURATION_FACTORS.days;
  }
  const hours = Math.floor(remaining / DURATION_FACTORS.hours);
  if(hours){
    parts.push(`${hours}h`);
    remaining -= hours * DURATION_FACTORS.hours;
  }
  const mins = remaining % DURATION_FACTORS.hours;
  if(mins){
    parts.push(`${mins}m`);
  }
  if(!parts.length) parts.push('0m');
  return parts.join(' ');
}
const getDurationMinutes = todo => Number(todo?.estimatedDurationMinutes) || 0;
function isTodoBlocked(todoId){
  const waitingOnSet = viewData.todoWaitingOn;
  const waitingOnMeSet = viewData.todoWaitingOnMe;
  if(!waitingOnSet || !waitingOnMeSet) return false;
  return waitingOnSet.has(todoId) && !waitingOnMeSet.has(todoId);
}

/*** ====== NAV + IO ====== ***/
const tabs=el('#tabs');
const views=['todos','projects','people','kanban','canvas','ai'];
function setTab(tab){views.forEach(id=>el('#view-'+id).classList.toggle('hidden',tab!==id)); store.current.tab=tab; save(); render(true);}

tabs.addEventListener('click',e=>{const b=e.target.closest('.tab'); if(!b) return; els('.tab').forEach(t=>t.classList.remove('active')); b.classList.add('active'); setTab(b.dataset.tab);});

// Backup functions
function exportBackup() {
  // Create and download backup
  const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});
  const a=document.createElement('a'); 
  a.href=URL.createObjectURL(blob); 
  a.download=`jwdm-backup-${new Date().toISOString().slice(0,10)}.json`; 
  document.body.appendChild(a); 
  a.click(); 
  a.remove();
  
  // Close command palette
  closeK();
}

function recoverAutoBackup() {
  const backupKey = LS_KEY + '_autobackup';
  const backup = localStorage.getItem(backupKey);
  
  if (!backup) {
    alert('No auto-backup found. Auto-backups are created every 10 saves.');
    closeK();
    return;
  }
  
  try {
    const data = JSON.parse(backup);
    if (!data.todos || !data.projects || !data.people) {
      throw new Error('Invalid backup data');
    }
    
    if (confirm('Restore from auto-backup? This will replace your current data. Current data will be exported first.')) {
      // Export current data first as safety
      exportBackup();
      
      // Wait a moment for download, then restore
      setTimeout(() => {
        store = data;
        save();
        render(true);
        alert('✅ Auto-backup restored successfully!');
      }, 500);
    }
  } catch (e) {
    console.error('Recovery error:', e);
    alert('Failed to recover auto-backup: ' + e.message);
  }
  
  closeK();
}

// Helper function to list all available backups (accessible from console)
window.listBackups = function() {
  const backups = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LS_KEY)) {
      const data = localStorage.getItem(key);
      backups.push({
        key: key,
        size: (data.length / 1024).toFixed(2) + ' KB',
        preview: data.substring(0, 100)
      });
    }
  }
  console.table(backups);
  console.log('To recover a specific backup, use: recoverFromKey("key_name")');
  return backups;
};

window.recoverFromKey = function(key) {
  const data = localStorage.getItem(key);
  if (!data) {
    console.error('Backup not found:', key);
    return;
  }
  try {
    const parsed = JSON.parse(data);
    if (confirm('Restore from "' + key + '"? Current data will be exported first.')) {
      exportBackup();
      setTimeout(() => {
        store = parsed;
        save();
        render(true);
        console.log('✅ Restored from:', key);
      }, 500);
    }
  } catch (e) {
    console.error('Invalid backup data:', e);
  }
};

el('#fileImport').addEventListener('change',e=>{const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{try{const data=JSON.parse(r.result); if(!data.todos||!data.projects||!data.people) throw new Error('Invalid backup'); 
  // Ensure imported data has view state structure
  if (!data.current) data.current = {};
  if (!data.current.filters) data.current.filters = {search:'', project:'', person:'', sort:'due-asc'};
  if (!data.canvasViews) data.canvasViews = {
    default: { id: 'default', name: 'Default Canvas', entities: {} }
  };
  store=data; save(); render();}catch(err){alert('Import failed: '+err.message);}}; r.readAsText(f); e.target.value='';});

/*** ====== UNIVERSAL FILTERS ====== ***/
const globalSearch = el('#globalSearch');
const globalProject = el('#globalProject');
const globalPerson = el('#globalPerson');
const globalStatus = el('#globalStatus');
const globalDueToday = el('#globalDueToday');
const globalOverdue = el('#globalOverdue');
const globalShowArchived = el('#globalShowArchived');
const btnClearFilters = el('#btnClearFilters');

// Compute universal view data - single source of filtered/sorted data
// This runs once per render cycle and all views consume this data
function computeViewData() {
  // Update derived maps
  viewData.projectsMap = store.projects;
  viewData.peopleMap = store.people;
  viewData.statuses = STATUS_DEFINITIONS;
  
  // Start with all base data (unfiltered from store)
  let todos = Object.values(store.todos);
  let projects = Object.values(store.projects);
  let people = Object.values(store.people);

  // Compute waiting relationships (always based on full store state)
  const waitingOnOthers = new Set();
  const waitingOnMe = new Set();
  Object.values(store.people).forEach(person => {
    (person.waitingForMe || []).forEach(id => waitingOnOthers.add(id));
    (person.waitingForThem || []).forEach(id => waitingOnMe.add(id));
  });
  viewData.todoWaitingOn = waitingOnOthers;
  viewData.todoWaitingOnMe = waitingOnMe;
  
  // Apply archived filter globally (unless explicitly showing archived)
  if (!globalShowArchived.checked) {
    todos = todos.filter(t => !t.archived);
    projects = projects.filter(p => !p.archived);
    people = people.filter(p => !p.archived);
  }
  
  // Apply global filters
  const searchTerm = globalSearch.value.trim().toLowerCase();
  if (searchTerm) {
    todos = todos.filter(t => universalHaystack(t).includes(searchTerm));
    projects = projects.filter(p => (p.name || '').toLowerCase().includes(searchTerm));
    people = people.filter(p => (p.name || '').toLowerCase().includes(searchTerm));
  }
  
  // Project filter (only applies to todos)
  const projectId = globalProject.value;
  if (projectId) {
    todos = todos.filter(t => t.projectId === projectId);
  }
  
  // Person filter (only applies to todos)
  const personId = globalPerson.value;
  if (personId) {
    todos = todos.filter(t => (t.people || []).includes(personId));
  }
  
  // Status filter (only applies to todos)
  const status = globalStatus.value;
  if (status) {
    todos = todos.filter(t => t.status === status);
  }
  
  // Due Today filter (only applies to todos)
  if (globalDueToday.checked) {
    const today = new Date().toISOString().slice(0, 10);
    todos = todos.filter(t => t.due === today);
  }
  
  // Overdue filter (only applies to todos)
  if (globalOverdue.checked) {
    const today = new Date().setHours(0, 0, 0, 0);
    todos = todos.filter(t => t.due && new Date(t.due) < today);
  }
  
  // Store computed data
  viewData.todos = todos;
  viewData.projects = projects;
  viewData.people = people;
}

// Legacy function for backwards compatibility - now just filters archived
function applyGlobalFilters(items) {
  if (!globalShowArchived.checked) {
    return items.filter(item => !item.archived);
  }
  return items;
}

// Update global filter dropdowns from single source of truth
function updateGlobalFilters() {
  const curProj = globalProject.value;
  const curPerson = globalPerson.value;
  const curStatus = globalStatus.value;
  
  // Populate projects dropdown
  globalProject.innerHTML = `<option value="">All projects</option>` + 
    Object.values(store.projects)
      .filter(p => !p.archived || globalShowArchived.checked)
      .map(p => `<option value="${p.id}">${p.name}</option>`)
      .join('');
  
  // Populate people dropdown
  globalPerson.innerHTML = `<option value="">All people</option>` + 
    Object.values(store.people)
      .filter(p => !p.archived || globalShowArchived.checked)
      .map(p => `<option value="${p.id}">${p.name}</option>`)
      .join('');
  
  // Populate status dropdown from single source of truth
  globalStatus.innerHTML = `<option value="">Any status</option>` + 
    STATUS_DEFINITIONS
      .map(s => `<option value="${s.id}">${s.label}</option>`)
      .join('');
  
  // Restore previous selections
  globalProject.value = curProj;
  globalPerson.value = curPerson;
  globalStatus.value = curStatus;
}

// Save global filters to store
function saveGlobalFilters() {
  if (!store.current) store.current = {};
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

// Restore global filters from store
function restoreGlobalFilters() {
  if (!store.current?.globalFilters) return;
  
  const gf = store.current.globalFilters;
  if (gf.search !== undefined) globalSearch.value = gf.search;
  if (gf.project !== undefined) globalProject.value = gf.project;
  if (gf.person !== undefined) globalPerson.value = gf.person;
  if (gf.status !== undefined) globalStatus.value = gf.status;
  if (gf.dueToday !== undefined) globalDueToday.checked = gf.dueToday;
  if (gf.overdue !== undefined) globalOverdue.checked = gf.overdue;
  if (gf.showArchived !== undefined) globalShowArchived.checked = gf.showArchived;
}

// Clear all filters
btnClearFilters.onclick = () => {
  globalSearch.value = '';
  globalProject.value = '';
  globalPerson.value = '';
  globalStatus.value = '';
  globalDueToday.checked = false;
  globalOverdue.checked = false;
  globalShowArchived.checked = false;
  
  saveGlobalFilters();
  render();
};

// Add event listeners to global filters - they trigger full re-render and save state
[globalSearch, globalProject, globalPerson, globalStatus, globalDueToday, globalOverdue, globalShowArchived].forEach(filter => {
  filter.addEventListener(filter.type === 'checkbox' ? 'change' : 'input', () => {
    saveGlobalFilters();
    render(); // Full re-render computes viewData and updates all views
  });
});

/*** ====== TODOS VIEW ====== ***/
const fSort=el('#fSort'), fGroup=el('#fGroup'), todoList=el('#todoList');
fSort.addEventListener('input',()=>{
  renderMainTodos();
  saveViewState();
});
fGroup.addEventListener('input',()=>{
  renderMainTodos();
});

// Track collapsed groups state
const collapsedGroups = { todos: new Set(), projects: new Set(), people: new Set() };

/*** ====== PEOPLE SORTING ====== ***/
const pSort=el('#pSort'), pGroup=el('#pGroup');
const PEOPLE_SORTS={
  'tasks-desc':(a,b)=>{
    const aTotal=(a.waitingForMe?.length||0)+(a.waitingForThem?.length||0);
    const bTotal=(b.waitingForMe?.length||0)+(b.waitingForThem?.length||0);
    if(aTotal===0&&bTotal>0)return 1;
    if(bTotal===0&&aTotal>0)return -1;
    return bTotal-aTotal||a.name.localeCompare(b.name);
  },
  'tasks-asc':(a,b)=>{
    const aTotal=(a.waitingForMe?.length||0)+(a.waitingForThem?.length||0);
    const bTotal=(b.waitingForMe?.length||0)+(b.waitingForThem?.length||0);
    if(aTotal===0&&bTotal>0)return 1;
    if(bTotal===0&&aTotal>0)return -1;
    return aTotal-bTotal||a.name.localeCompare(b.name);
  },
  'waiting-me-desc':(a,b)=>{
    const aLen=a.waitingForMe?.length||0;
    const bLen=b.waitingForMe?.length||0;
    if(aLen===0&&bLen>0)return 1;
    if(bLen===0&&aLen>0)return -1;
    return bLen-aLen||a.name.localeCompare(b.name);
  },
  'waiting-them-desc':(a,b)=>{
    const aLen=a.waitingForThem?.length||0;
    const bLen=b.waitingForThem?.length||0;
    if(aLen===0&&bLen>0)return 1;
    if(bLen===0&&aLen>0)return -1;
    return bLen-aLen||a.name.localeCompare(b.name);
  },
  'name-asc':(a,b)=>a.name.localeCompare(b.name),
  'name-desc':(a,b)=>b.name.localeCompare(a.name),
};
pSort.addEventListener('input',()=>renderPeople());
pGroup.addEventListener('input',()=>renderPeople());

/*** ====== PROJECT SORTING ====== ***/
const prSort=el('#prSort');
const PROJECT_SORTS={
  'todos-desc':(a,b)=>{
    const aLen=(a.todoIds||[]).length;
    const bLen=(b.todoIds||[]).length;
    return bLen-aLen||a.name.localeCompare(b.name);
  },
  'todos-asc':(a,b)=>{
    const aLen=(a.todoIds||[]).length;
    const bLen=(b.todoIds||[]).length;
    return aLen-bLen||a.name.localeCompare(b.name);
  },
  'name-asc':(a,b)=>a.name.localeCompare(b.name),
  'name-desc':(a,b)=>b.name.localeCompare(a.name),
};
prSort.addEventListener('input',()=>renderProjects());

const compareDurationAsc = (a,b)=>{
  const aDur = getDurationMinutes(a);
  const bDur = getDurationMinutes(b);
  const aHas = aDur > 0;
  const bHas = bDur > 0;
  if(aHas && bHas){
    if(aDur !== bDur) return aDur - bDur;
    return (a.title||'').localeCompare(b.title||'');
  }
  if(aHas !== bHas) return aHas ? -1 : 1;
  return (a.title||'').localeCompare(b.title||'');
};
const compareDurationDesc = (a,b)=>{
  const aDur = getDurationMinutes(a);
  const bDur = getDurationMinutes(b);
  const aHas = aDur > 0;
  const bHas = bDur > 0;
  if(aHas && bHas){
    if(aDur !== bDur) return bDur - aDur;
    return (a.title||'').localeCompare(b.title||'');
  }
  if(aHas !== bHas) return aHas ? -1 : 1;
  return (a.title||'').localeCompare(b.title||'');
};

const SORTS={
  'due-asc':(a,b)=> (a.due||'9999-12-31')<(b.due||'9999-12-31')?-1:1,
  'due-desc':(a,b)=> (a.due||'0000-01-01')>(b.due||'0000-01-01')?-1:1,
  'priority-desc':(a,b)=> score(b)-score(a),
  'priority-asc':(a,b)=> score(a)-score(b),
  'status-asc':(a,b)=> (a.status||'').localeCompare(b.status||''),
  'project-asc':(a,b)=> projName(a).localeCompare(projName(b)),
  'project-desc':(a,b)=> projName(b).localeCompare(projName(a)),
  'title-asc':(a,b)=> (a.title||'').localeCompare(b.title||''),
  'created-desc':(a,b)=> (b.created||0)-(a.created||0),
  'duration-asc': compareDurationAsc,
  'duration-desc': compareDurationDesc,
};

// Helper to render a single todo row
function renderTodoRow(t) {
  const isLate = t.due && new Date(t.due) < new Date().setHours(0, 0, 0, 0);
  const dueClass = isLate ? 'style="color:var(--bad)"' : '';
  const project = store.projects[t.projectId];
  const archivedStyle = t.archived ? 'style="opacity:0.5"' : '';
  const archivedBadge = t.archived ? '<span class="badge" style="background:var(--muted);color:#fff;margin-left:8px">🗄 Archived</span>' : '';
  const blocked = isTodoBlocked(t.id);
  const rowClasses = ['todoRow'];
  if (blocked) rowClasses.push('blocked');
  const fullTitle = t.title || '';
  const safeFullTitle = escapeHtml(fullTitle);
  const isLong = fullTitle.trim().length > TITLE_MAX_LEN;
  const titleCellClasses = ['title-cell'];
  if (isLong) titleCellClasses.push('has-long-title');
  const blockedBadge = blocked ? '<span class="badge badge-blocked">Blocked</span>' : '';
  const durationMinutes = getDurationMinutes(t);
  const durationBadge = durationMinutes > 0 ? `<span class="badge badge-duration" title="Estimated duration: ${formatDuration(durationMinutes)}">⏱ ${formatDuration(durationMinutes)}</span>` : '';
  const badges = [durationBadge, blockedBadge, archivedBadge].filter(Boolean);
  
  return `<div class="${rowClasses.join(' ')}" data-id="${t.id}" ${archivedStyle}>
    <div class="hiu" data-id="${t.id}">
      <span class="d h ${t.eisen?.impact ? 'on' : ''}" data-act="toggle" data-k="impact" title="High impact"></span>
      <span class="d i ${t.eisen?.important ? 'on' : ''}" data-act="toggle" data-k="important" title="Important"></span>
      <span class="d u ${t.eisen?.urgent ? 'on' : ''}" data-act="toggle" data-k="urgent" title="Urgent"></span>
    </div>
    <div class="${titleCellClasses.join(' ')}">
      <span class="title" contenteditable="true" spellcheck="false" data-act="editTitle" data-id="${t.id}" title="${safeFullTitle}">${safeFullTitle}</span>
      <span class="title-ellipsis" aria-hidden="true">...</span>
      ${badges.join(' ')}
    </div>
    <div class="meta-text">${project?.name || '—'}</div>
    <div class="meta-text" ${dueClass}>${t.due ? fmtDue(t.due) : '—'}</div>
  </div>`;
}

// Group todos by a key
function groupTodosBy(todos, groupBy) {
  const groups = new Map();
  const ungrouped = [];
  
  todos.forEach(t => {
    let keys = [];
    if (groupBy === 'project') {
      const p = store.projects[t.projectId];
      keys = p ? [{ id: t.projectId, name: p.name, color: p.color }] : [];
    } else if (groupBy === 'status') {
      keys = [{ id: t.status || 'none', name: t.status || 'No status', color: null }];
    } else if (groupBy === 'person') {
      keys = (t.people || []).map(pid => {
        const p = store.people[pid];
        return p ? { id: pid, name: p.name, color: pColor(p) } : null;
      }).filter(Boolean);
    } else if (groupBy === 'due') {
      const today = new Date().toISOString().slice(0,10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0,10);
      const weekEnd = new Date(Date.now() + 7*86400000).toISOString().slice(0,10);
      if (!t.due) keys = [{ id: 'no-due', name: 'No due date', color: null }];
      else if (t.due < today) keys = [{ id: 'overdue', name: '⚠️ Overdue', color: '#ff3b30' }];
      else if (t.due === today) keys = [{ id: 'today', name: '📌 Today', color: '#ff9500' }];
      else if (t.due === tomorrow) keys = [{ id: 'tomorrow', name: 'Tomorrow', color: null }];
      else if (t.due <= weekEnd) keys = [{ id: 'this-week', name: 'This week', color: null }];
      else keys = [{ id: 'later', name: 'Later', color: null }];
    }
    
    if (keys.length === 0) {
      ungrouped.push(t);
    } else {
      keys.forEach(key => {
        if (!groups.has(key.id)) groups.set(key.id, { ...key, todos: [] });
        groups.get(key.id).todos.push(t);
      });
    }
  });
  
  // Add ungrouped section if needed
  if (ungrouped.length > 0) {
    groups.set('_ungrouped', { id: '_ungrouped', name: 'Ungrouped', color: null, todos: ungrouped });
  }
  
  return Array.from(groups.values());
}

function renderMainTodos() {
  let items = [...viewData.todos];
  const sorter = SORTS[fSort.value] || SORTS['due-asc'];
  items.sort(sorter);
  
  el('#countInfo').textContent = `${items.length} todos shown`;
  
  const header = `<div class="todoHeader">
    <div>Priority</div>
    <div>Title</div>
    <div>Project</div>
    <div>Due</div>
  </div>`;
  
  const groupBy = fGroup.value;
  
  if (!groupBy) {
    // No grouping - flat list
    todoList.innerHTML = header + items.map(renderTodoRow).join('');
  } else {
    // Grouped view
    const groups = groupTodosBy(items, groupBy);
    todoList.innerHTML = header + groups.map(g => {
      const isCollapsed = collapsedGroups.todos.has(g.id);
      const colorDot = g.color ? `<span class="group-color" style="background:${g.color}"></span>` : '';
      return `<div class="group-section" data-group="${g.id}">
        <div class="group-header${isCollapsed ? ' collapsed' : ''}" data-act="toggleGroup" data-group="${g.id}">
          <i class="fas fa-chevron-down chevron"></i>
          ${colorDot}
          <span>${g.name}</span>
          <span class="group-count">${g.todos.length}</span>
        </div>
        <div class="group-content${isCollapsed ? ' collapsed' : ''}">
          ${g.todos.map(renderTodoRow).join('')}
        </div>
      </div>`;
    }).join('');
  }
  
  // Event listeners for main todos view
  todoList.onclick = e => {
    // Group toggle
    if (e.target.closest('[data-act="toggleGroup"]')) {
      const groupId = e.target.closest('[data-group]').dataset.group;
      if (collapsedGroups.todos.has(groupId)) {
        collapsedGroups.todos.delete(groupId);
      } else {
        collapsedGroups.todos.add(groupId);
      }
      renderMainTodos();
      return;
    }
    
    const id = e.target.dataset.id;
    if (e.target.dataset.act === 'toggle') {
      const k = e.target.dataset.k;
      const t = store.todos[e.target.closest('.hiu').dataset.id];
      t.eisen = t.eisen || {impact: 0, important: 0, urgent: 0};
      t.eisen[k] = t.eisen[k] ? 0 : 1;
      save();
      renderMainTodos();
    }
    
    const todoRow = e.target.closest('.todoRow');
    if (todoRow && !e.target.dataset.act && !e.target.closest('select, input, button, .hiu .d, .title')) {
      const todoId = todoRow.dataset.id;
      if (todoId) openTodoModal(todoId);
    }
  };
  
  // Inline title edit
  todoList.addEventListener('keydown', (e) => {
    if (e.target.dataset.act === 'editTitle' && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  });
  todoList.addEventListener('focus', (e) => {
    if (e.target.dataset.act === 'editTitle') {
      const id = e.target.dataset.id;
      if (!id) return;
      const fullTitle = store.todos[id]?.title || '';
      e.target.textContent = fullTitle;
      e.target.setAttribute('title', fullTitle);
      setTitleEditingState(e.target, true);
      applyTitleOverflowState(e.target, fullTitle);
    }
  }, true);
  
  todoList.addEventListener('blur', (e) => {
    if (e.target.dataset.act === 'editTitle') {
      const id = e.target.dataset.id;
      const v = e.target.textContent.trim();
      store.todos[id].title = v || store.todos[id].title;
      save();
      const fullTitle = store.todos[id]?.title || '';
      e.target.textContent = fullTitle;
      e.target.setAttribute('title', fullTitle);
      setTitleEditingState(e.target, false);
      applyTitleOverflowState(e.target, fullTitle);
    }
  }, true);
}

const renderTodos = (items = [], container, {showProject=false, showPeople=false, showTags=false, showStatus=true, showDue=true}={}) => {
  const sorted = items.filter(t => !t.archived).sort((a, b) => {
    const aVal = Number(a.eisen?.impact) * 2 + Number(a.eisen?.important) + Number(a.eisen?.urgent);
    const bVal = Number(b.eisen?.impact) * 2 + Number(b.eisen?.important) + Number(b.eisen?.urgent);
    return bVal - aVal;
  });
  
  container.innerHTML = sorted.map(t => {
    const isLate = t.due && new Date(t.due) < new Date().setHours(0,0,0,0);
    const dueClass = isLate ? 'style="color:var(--bad)"' : '';
    const project = store.projects[t.projectId];
    const people = (t.people || []).map(pid => store.people[pid]).filter(Boolean);
    const tags = (t.tags || []).map(tag => `<span class="pill" style="background:var(--acc);color:#fff;border-color:transparent">${tag}</span>`).join(' ');
  const blocked = isTodoBlocked(t.id);
  const rowClasses = ['todoRow'];
  if (blocked) rowClasses.push('blocked');
  const fullTitle = t.title || '';
  const safeFullTitle = escapeHtml(fullTitle);
  const isLong = fullTitle.trim().length > TITLE_MAX_LEN;
  const titleCellClasses = ['title-cell'];
  if (isLong) titleCellClasses.push('has-long-title');
  const blockedBadge = blocked ? '<span class="badge badge-blocked">Blocked</span>' : '';
  const durationMinutes = getDurationMinutes(t);
  const durationBadge = durationMinutes > 0 ? `<span class="badge badge-duration" title="Estimated duration: ${formatDuration(durationMinutes)}">⏱ ${formatDuration(durationMinutes)}</span>` : '';
  const badges = [durationBadge, blockedBadge].filter(Boolean);
    
    return `<div class="${rowClasses.join(' ')}" data-id="${t.id}">
      <div class="hiu" data-id="${t.id}">
        <span class="d h ${t.eisen?.impact?'on':''}" data-act="toggle" data-k="impact" title="High impact"></span>
        <span class="d i ${t.eisen?.important?'on':''}" data-act="toggle" data-k="important" title="Important"></span>
        <span class="d u ${t.eisen?.urgent?'on':''}" data-act="toggle" data-k="urgent" title="Urgent"></span>
      </div>
      <div class="${titleCellClasses.join(' ')}">
  <span class="title" contenteditable="true" spellcheck="false" data-act="editTitle" data-id="${t.id}" title="${safeFullTitle}">${safeFullTitle}</span>
  <span class="title-ellipsis" aria-hidden="true">...</span>
  ${badges.join(' ')}
      </div>
      <div class="meta-text">${t.status}</div>
      <div class="meta-text">${project?.name || '—'}</div>
      <div class="meta-text">${t.due ? fmtDue(t.due) : '—'}</div>
      <div class="actions"></div>
    </div>`;
  }).join('');

  // interactions
  container.onchange=e=>{
    const id=e.target.dataset.id; if(!id) return;
    if(e.target.dataset.act==='setStatus'){store.todos[id].status=e.target.value; save(); renderTodos();}
    if(e.target.dataset.act==='setProject'){
      const oldProjectId = store.todos[id].projectId;
      const newProjectId = e.target.value;
      
      // Update todo's project
      store.todos[id].projectId = newProjectId;
      
      // Remove from old project
      if(oldProjectId && store.projects[oldProjectId]) {
        const oldProject = store.projects[oldProjectId];
        oldProject.todoIds = (oldProject.todoIds || []).filter(tid => tid !== id);
      }
      
      // Add to new project
      if(newProjectId && store.projects[newProjectId]) {
        const newProject = store.projects[newProjectId];
        if(!newProject.todoIds) newProject.todoIds = [];
        if(!newProject.todoIds.includes(id)) {
          newProject.todoIds.push(id);
        }
      }
      
      save(); 
      renderTodos();
      renderProjects(); // Update project view to reflect changes
      renderKanban(); // Update kanban view in case todos moved
    }
  };
  container.onclick=e=>{
    const id=e.target.dataset.id;
    if(e.target.dataset.act==='openModal'){ openTodoModal(id); }
    if(e.target.dataset.act==='toggle'){
      const k=e.target.dataset.k; const t=store.todos[e.target.closest('.hiu').dataset.id]; t.eisen=t.eisen||{impact:0,important:0,urgent:0}; t.eisen[k]=t.eisen[k]?0:1; save(); renderTodos();
    }
    
    // If clicking on a todo row but not on any specific control element, open the modal
    const todoRow = e.target.closest('.todoRow');
    if (todoRow && !e.target.dataset.act && !e.target.closest('select, input, button, .hiu .d, .title')) {
      const todoId = todoRow.dataset.id;
      if (todoId) {
        openTodoModal(todoId);
      }
    }
  };
  // inline title edit
  container.addEventListener('keydown', (e)=>{ if(e.target.dataset.act==='editTitle' && e.key==='Enter'){ e.preventDefault(); e.target.blur(); }});
  container.addEventListener('focus', (e)=>{
    if(e.target.dataset.act==='editTitle'){
      const id=e.target.dataset.id;
      if(!id) return;
      const fullTitle = store.todos[id]?.title || '';
      e.target.textContent = fullTitle;
      e.target.setAttribute('title', fullTitle);
      setTitleEditingState(e.target, true);
      applyTitleOverflowState(e.target, fullTitle);
    }
  }, true);
  container.addEventListener('blur', (e)=>{
    if(e.target.dataset.act==='editTitle'){
      const id=e.target.dataset.id;
      const v=e.target.textContent.trim();
      store.todos[id].title=v||store.todos[id].title;
      save();
      const fullTitle = store.todos[id]?.title || '';
      e.target.textContent = fullTitle;
      e.target.setAttribute('title', fullTitle);
      setTitleEditingState(e.target, false);
      applyTitleOverflowState(e.target, fullTitle);
    }
  }, true);
}

/*** ====== PROJECTS VIEW ====== ***/
const projectList=el('#projectList');
el('#btnAddProject').onclick=()=>el('#dlgProject').showModal();
const saveProjectHandler = e=>{e.preventDefault(); const name=el('#pName').value.trim(); if(!name) return; const color=el('#pColor').value||'#7cc9ff'; const id='p'+nextId(); store.projects[id]={id,name,color,todoIds:[]}; save(); el('#dlgProject').close(); el('#projectForm').reset(); renderProjects(); renderTodos();};
el('#btnSaveProject').onclick=saveProjectHandler;
// Add Enter key handler for Project modal
el('#dlgProject').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveProjectHandler(e);
  }
});

// Expand/Collapse all projects
el('#btnExpandAllProjects').onclick = () => { collapsedGroups.projects.clear(); renderProjects(); };
el('#btnCollapseAllProjects').onclick = () => { 
  viewData.projects.forEach(p => collapsedGroups.projects.add(p.id)); 
  renderProjects(); 
};

function renderProjects(){
  let projects = [...viewData.projects];
  const sorter = PROJECT_SORTS[prSort.value] || PROJECT_SORTS['todos-desc'];
  projects.sort(sorter);
  el('#projectCountInfo').textContent = `${projects.length} projects`;
  
  projectList.innerHTML = projects.map(p => {
    const todos = viewData.todos.filter(t => (p.todoIds || []).includes(t.id));
    const isCollapsed = collapsedGroups.projects.has(p.id);
    const today = new Date().setHours(0,0,0,0);
    
    const todoChips = todos.map(t => {
      const isOverdue = t.due && new Date(t.due) < today;
      return `<span class="ptodo${isOverdue ? ' overdue' : ''}" data-act="open" data-id="${t.id}" title="${t.title}${t.due ? ' · ' + fmtDue(t.due) : ''}">${t.title.length > 30 ? t.title.slice(0,28) + '…' : t.title}</span>`;
    }).join('');
    
    return `<div class="group-section" data-pid="${p.id}">
      <div class="group-header${isCollapsed ? ' collapsed' : ''}" data-act="toggleProject" data-pid="${p.id}">
        <i class="fas fa-chevron-down chevron"></i>
        <span class="group-color" style="background:${p.color}"></span>
        <span class="project-name" contenteditable="true" spellcheck="false" data-act="editProjectName" data-pid="${p.id}" title="Click to edit">${p.name}</span>
        <span class="group-count">${todos.length} todos</span>
      </div>
      <div class="group-content${isCollapsed ? ' collapsed' : ''}">
        <div class="project-todos-inline">${todoChips || '<span class="pempty">No todos yet</span>'}</div>
      </div>
    </div>`;
  }).join('');
  
  projectList.onclick = e => {
    // Toggle expand/collapse
    if (e.target.closest('[data-act="toggleProject"]') && !e.target.closest('.pacts') && !e.target.dataset.act) {
      const pid = e.target.closest('[data-pid]').dataset.pid;
      if (collapsedGroups.projects.has(pid)) {
        collapsedGroups.projects.delete(pid);
      } else {
        collapsedGroups.projects.add(pid);
      }
      renderProjects();
      return;
    }
    
    // Use closest() to handle clicks on child elements (like icons inside buttons)
    const actionBtn = e.target.closest('[data-act]');
    if (!actionBtn) return;
    
    const action = actionBtn.dataset.act;
    const pid = actionBtn.dataset.pid;
    const id = actionBtn.dataset.id;
    
    if (action === 'addToProject') openTodoModal(null, pid);
    if (action === 'open') openTodoModal(id);
  };
  
  // Inline project name editing
  projectList.addEventListener('keydown', (e) => {
    if (e.target.dataset.act === 'editProjectName' && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  });
  
  projectList.addEventListener('blur', (e) => {
    if (e.target.dataset.act === 'editProjectName') {
      const projectId = e.target.dataset.pid;
      const newName = e.target.textContent.trim();
      
      if (newName && store.projects[projectId]) {
        store.projects[projectId].name = newName;
        save();
        renderProjects();
        renderTodos();
        renderKanban();
        refreshProjectSelects();
      } else if (!newName) {
        renderProjects();
      }
    }
  }, true);
}

// === UNIFIED CONTEXT MENU SYSTEM ===
const allContextMenus = document.querySelectorAll('.context-menu');
let activeContextMenu = null;
let contextData = {};

function hideAllContextMenus() {
  allContextMenus.forEach(m => m.classList.remove('visible'));
  activeContextMenu = null;
  contextData = {};
}

function showContextMenuAt(menu, x, y, data = {}) {
  hideAllContextMenus();
  activeContextMenu = menu;
  contextData = data;
  
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.classList.add('visible');
  
  // Adjust if menu goes off screen
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (window.innerWidth - rect.width - 10) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (window.innerHeight - rect.height - 10) + 'px';
    }
  });
}

// Global context menu dismiss
document.addEventListener('click', e => {
  if (activeContextMenu && !activeContextMenu.contains(e.target)) {
    hideAllContextMenus();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideAllContextMenus(); });
window.addEventListener('scroll', hideAllContextMenus, true);

// === PROJECT CONTEXT MENU ===
const projectContextMenu = el('#contextMenu');
projectList.addEventListener('contextmenu', e => {
  const projectSection = e.target.closest('[data-pid]');
  if (projectSection) {
    e.preventDefault();
    showContextMenuAt(projectContextMenu, e.clientX, e.clientY, { pid: projectSection.dataset.pid });
  }
});

projectContextMenu.addEventListener('click', e => {
  const item = e.target.closest('[data-action]');
  if (!item) return;
  
  const action = item.dataset.action;
  const pid = contextData.pid;
  hideAllContextMenus();
  
  if (action === 'addTodo') openTodoModal(null, pid);
  else if (action === 'editProject') {
    const nameEl = projectList.querySelector(`[data-act="editProjectName"][data-pid="${pid}"]`);
    if (nameEl) {
      nameEl.focus();
      const range = document.createRange();
      range.selectNodeContents(nameEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
  else if (action === 'expandAll') { collapsedGroups.projects.clear(); renderProjects(); }
  else if (action === 'collapseAll') { viewData.projects.forEach(p => collapsedGroups.projects.add(p.id)); renderProjects(); }
  else if (action === 'deleteProject') openDeleteProjectModal(pid);
});

// === TODO CONTEXT MENU ===
const todoContextMenu = el('#todoContextMenu');

todoList.addEventListener('contextmenu', e => {
  const todoCard = e.target.closest('[data-id]');
  if (todoCard) {
    e.preventDefault();
    showContextMenuAt(todoContextMenu, e.clientX, e.clientY, { id: todoCard.dataset.id });
  }
});

todoContextMenu.addEventListener('click', e => {
  const item = e.target.closest('[data-action]');
  if (!item) return;
  
  const action = item.dataset.action;
  const id = contextData.id;
  hideAllContextMenus();
  
  if (action === 'editTodo') openTodoModal(id);
  else if (action === 'duplicateTodo') {
    const todo = store.todos[id];
    if (todo) {
      const newId = 't' + nextId();
      store.todos[newId] = { ...todo, id: newId, title: todo.title + ' (copy)', created: Date.now() };
      if (todo.projectId && store.projects[todo.projectId]) {
        store.projects[todo.projectId].todoIds.push(newId);
      }
      save(); render();
    }
  }
  else if (action === 'archiveTodo') {
    if (store.todos[id]) { store.todos[id].archived = true; save(); render(); }
  }
  else if (action === 'deleteTodo') {
    if (confirm('Delete this todo?')) { deleteTodo(id); save(); render(); }
  }
});

// === LIST CONTEXT MENU (empty area) ===
const listContextMenu = el('#listContextMenu');
document.querySelector('#view-todos').addEventListener('contextmenu', e => {
  if (!e.target.closest('[data-id]') && e.target.closest('.list-todos, .panel')) {
    e.preventDefault();
    showContextMenuAt(listContextMenu, e.clientX, e.clientY, { view: 'todos' });
  }
});

listContextMenu.addEventListener('click', e => {
  const item = e.target.closest('[data-action]');
  if (!item) return;
  
  const action = item.dataset.action;
  hideAllContextMenus();
  
  if (action === 'addNew') openTodoModal();
  else if (action === 'createCanvas') {
    // Create canvas from visible todos
    el('#btnCreateCanvasFromTodos')?.click();
  }
});

// === PERSON CONTEXT MENU ===
const personContextMenu = el('#personContextMenu');
const peopleList = el('#peopleList');

peopleList.addEventListener('contextmenu', e => {
  const personRow = e.target.closest('[data-person]');
  if (personRow) {
    e.preventDefault();
    showContextMenuAt(personContextMenu, e.clientX, e.clientY, { personId: personRow.dataset.person });
  }
});

personContextMenu.addEventListener('click', e => {
  const item = e.target.closest('[data-action]');
  if (!item) return;
  
  const action = item.dataset.action;
  const personId = contextData.personId;
  hideAllContextMenus();
  
  if (action === 'addTask') openAddPersonTaskModal(personId);
  else if (action === 'attachTask') openAttachTodoModal(personId, 'waitingForMe');
  else if (action === 'deletePerson') {
    const person = store.people[personId];
    if (person && confirm(`Delete "${person.name}"?`)) {
      delete store.people[personId];
      save(); renderPeople();
    }
  }
});

// Helper for person tasks
function openAddPersonTaskModal(personId) {
  // Open todo modal and pre-assign person
  openTodoModal(null, null);
  // Set person after modal opens
  setTimeout(() => {
    const personSelect = el('#tPerson');
    if (personSelect) personSelect.value = personId;
  }, 50);
}

// === KANBAN CONTEXT MENU ===
const kanbanContextMenu = el('#kanbanContextMenu');
const kanbanSection = el('#view-kanban');

kanbanSection.addEventListener('contextmenu', e => {
  if (!e.target.closest('.kcard')) {
    e.preventDefault();
    showContextMenuAt(kanbanContextMenu, e.clientX, e.clientY, {});
  }
});

kanbanContextMenu.addEventListener('click', e => {
  const item = e.target.closest('[data-action]');
  if (!item) return;
  
  const action = item.dataset.action;
  hideAllContextMenus();
  
  if (action === 'newBoard') openBoardModal();
  else if (action === 'editBoard') openEditBoardModal();
  else if (action === 'addColumn') {
    const dlg = el('#dlgColumn');
    if (dlg) dlg.showModal();
  }
  else if (action === 'deleteBoard') {
    const currentBoard = kbSelect.value;
    if (currentBoard && currentBoard !== 'default' && confirm('Delete this board?')) {
      delete store.boards[currentBoard];
      save(); renderKanban();
    }
  }
});

// === CANVAS CONTEXT MENU ===
const canvasContextMenu = el('#canvasContextMenu');
const canvasContainerEl = el('#canvasContainer');

if (canvasContainerEl) {
  canvasContainerEl.addEventListener('contextmenu', e => {
    if (!e.target.closest('.canvas-entity')) {
      e.preventDefault();
      showContextMenuAt(canvasContextMenu, e.clientX, e.clientY, {});
    }
  });
}

canvasContextMenu.addEventListener('click', e => {
  const item = e.target.closest('[data-action]');
  if (!item) return;
  
  const action = item.dataset.action;
  hideAllContextMenus();
  
  if (action === 'addTodoToCanvas') el('#btnAddTodoToCanvas')?.click();
  else if (action === 'addProjectToCanvas') el('#btnAddProjectToCanvas')?.click();
  else if (action === 'addAllTodos') el('#btnAddAllTodos')?.click();
  else if (action === 'newCanvas') el('#btnAddCanvasView')?.click();
  else if (action === 'arrangeEntities') el('#btnArrangeEntities')?.click();
  else if (action === 'fitToContent') el('#btnFitToContent')?.click();
  else if (action === 'resetView') el('#btnCanvasReset')?.click();
  else if (action === 'deleteCanvas') el('#btnDeleteCanvasView')?.click();
});

/*** ====== PEOPLE VIEW ====== ***/

// Populate projects checkboxes when opening person modal
let editingPersonId = null;

function openPersonModal(personId = null) {
  editingPersonId = personId;
  const person = personId ? store.people[personId] : null;
  const sProjects = el('#sProjects');
  const personProjects = person?.projects || [];
  
  sProjects.innerHTML = Object.values(store.projects).map(p => 
    `<label><input type="checkbox" value="${p.id}"${personProjects.includes(p.id) ? ' checked' : ''}><span class="group-color" style="background:${p.color}"></span>${p.name}</label>`
  ).join('');
  
  if (person) {
    el('#sName').value = person.name || '';
    el('#sInit').value = person.initials || '';
    el('#personForm').querySelector('h3').textContent = 'Edit Person';
  } else {
    el('#sName').value = '';
    el('#sInit').value = '';
    el('#personForm').querySelector('h3').textContent = 'New Person';
  }
  
  el('#dlgPerson').showModal();
}

el('#btnAddPerson').onclick = () => openPersonModal();

const savePersonHandler = e => {
  e.preventDefault();
  const name = el('#sName').value.trim();
  if (!name) return;
  const initials = (el('#sInit').value.trim() || name.split(/\s+/).map(s => s[0]).join('').slice(0, 3)).toUpperCase();
  const selectedProjects = Array.from(el('#sProjects').querySelectorAll('input:checked')).map(cb => cb.value);
  
  if (editingPersonId && store.people[editingPersonId]) {
    // Update existing person
    store.people[editingPersonId].name = name;
    store.people[editingPersonId].initials = initials;
    store.people[editingPersonId].projects = selectedProjects;
  } else {
    // Create new person
    const id = initials.toLowerCase() + nextId();
    store.people[id] = { id, name, initials, waitingForMe: [], waitingForThem: [], projects: selectedProjects };
  }
  
  save();
  el('#dlgPerson').close();
  el('#personForm').reset();
  editingPersonId = null;
  renderPeople();
  renderTodos();
};
el('#btnSavePerson').onclick=savePersonHandler;
// Add Enter key handler for Person modal
el('#dlgPerson').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    savePersonHandler(e);
  }
});

function openDeleteProjectModal(projectId) {
  const project = store.projects[projectId];
  if (!project) return;
  
  const todoIds = project.todoIds || [];
  const todoCount = todoIds.length;
  
  el('#deleteProjectId').value = projectId;
  el('#deleteProjectName').textContent = project.name;
  el('#deleteTodoCount').textContent = todoCount === 0 ? 'no todos' : 
    todoCount === 1 ? '1 todo' : `${todoCount} todos`;
  
  // Populate reassign dropdown with other projects
  const reassignSelect = el('#reassignProjectSelect');
  const otherProjects = Object.values(store.projects).filter(p => p.id !== projectId);
  reassignSelect.innerHTML = '<option value="">Select target project...</option>' +
    otherProjects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  
  // Reset form to default (unassign)
  el('input[name="deleteMode"][value="unassign"]').checked = true;
  reassignSelect.disabled = true;
  
  // Hide reassign option if no other projects exist
  const reassignContainer = el('#reassignProjectContainer').closest('div');
  reassignContainer.style.display = otherProjects.length > 0 ? 'block' : 'none';
  
  el('#dlgDeleteProject').showModal();
}

function deleteProject(projectId, mode, targetProjectId = null) {
  const project = store.projects[projectId];
  if (!project) return false;
  
  const todoIds = project.todoIds || [];
  
  if (mode === 'deleteTodos') {
    // Delete all todos in this project
    todoIds.forEach(todoId => {
      deleteTodo(todoId);
    });
  } else if (mode === 'reassign' && targetProjectId) {
    // Reassign todos to another project
    const targetProject = store.projects[targetProjectId];
    if (!targetProject) return false;
    
    todoIds.forEach(todoId => {
      if (store.todos[todoId]) {
        store.todos[todoId].projectId = targetProjectId;
        // Add to target project's todo list
        if (!targetProject.todoIds.includes(todoId)) {
          targetProject.todoIds.push(todoId);
        }
      }
    });
  } else {
    // Unassign todos from project
    todoIds.forEach(todoId => {
      if (store.todos[todoId]) {
        store.todos[todoId].projectId = '';
      }
    });
  }
  
  // Delete the project itself
  delete store.projects[projectId];
  
  save();
  return true;
}

const deleteProjectHandler = e => {
  e.preventDefault();
  const projectId = el('#deleteProjectId').value;
  const mode = el('input[name="deleteMode"]:checked').value;
  const targetProjectId = el('#reassignProjectSelect').value;
  
  const project = store.projects[projectId];
  const todoCount = (project?.todoIds || []).length;
  
  // Validation for reassign mode
  if (mode === 'reassign' && !targetProjectId) {
    alert('Please select a target project to reassign todos to.');
    return;
  }
  
  let confirmMsg;
  if (mode === 'deleteTodos') {
    confirmMsg = `Are you sure you want to delete "${project.name}" and permanently delete all ${todoCount} todos?\n\nThis action cannot be undone!`;
  } else if (mode === 'reassign') {
    const targetProject = store.projects[targetProjectId];
    confirmMsg = `Delete "${project.name}" and move ${todoCount} todos to "${targetProject.name}"?`;
  } else {
    confirmMsg = `Delete "${project.name}"?\n\n${todoCount > 0 ? `${todoCount} todos will be unassigned but kept.` : 'No todos to unassign.'}`;
  }
  
  if (confirm(confirmMsg)) {
    if (deleteProject(projectId, mode, targetProjectId)) {
      el('#dlgDeleteProject').close();
      
      // Clear global project filter if it was set to the deleted project
      if (globalProject.value === projectId) {
        globalProject.value = '';
        saveGlobalFilters();
      }
      
      // Full re-render to refresh viewData and all views
      render();
    }
  }
};

el('#btnConfirmDeleteProject').onclick = deleteProjectHandler;

// Handle radio button changes for delete mode
el('#dlgDeleteProject').addEventListener('change', e => {
  if (e.target.name === 'deleteMode') {
    const reassignSelect = el('#reassignProjectSelect');
    const isReassign = e.target.value === 'reassign';
    reassignSelect.disabled = !isReassign;
    if (!isReassign) {
      reassignSelect.value = '';
    }
  }
});

// Add Enter key handler for Delete Project modal  
el('#dlgDeleteProject').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    deleteProjectHandler(e);
  }
});
function recomputeTodoPeople(todoId){const ids=Object.values(store.people).filter(p=>(p.waitingForMe||[]).includes(todoId)||(p.waitingForThem||[]).includes(todoId)).map(p=>p.id); const t=store.todos[todoId]; if(t) t.people=[...new Set(ids)];}

// Helper to render a single person row
function renderPersonRow(p) {
  const viewTodoIds = new Set(viewData.todos.map(t => t.id));
  const waitingForMe = (p.waitingForMe || []).filter(id => viewTodoIds.has(id));
  const waitingForThem = (p.waitingForThem || []).filter(id => viewTodoIds.has(id));
  const personProjects = (p.projects || []).map(pid => store.projects[pid]).filter(Boolean);
  
  const taskChip = (tid, side) => {
    const t = store.todos[tid];
    if (!t) return '';
    const isOverdue = t.due && new Date(t.due) < new Date().setHours(0,0,0,0);
    return `<span class="ptask${isOverdue ? ' overdue' : ''}" data-pid="${p.id}" data-side="${side}" data-tid="${tid}" data-act="open" data-id="${t.id}" title="${t.title}${t.due ? ' · ' + fmtDue(t.due) : ''}">${t.title.length > 25 ? t.title.slice(0,23) + '…' : t.title}<button class="xbtn" title="Remove">×</button></span>`;
  };
  
  const waitingForMeHtml = waitingForMe.length 
    ? waitingForMe.map(id => taskChip(id, 'waitingForMe')).join('') 
    : `<span class="pempty">—</span>`;
  const waitingForThemHtml = waitingForThem.length 
    ? waitingForThem.map(id => taskChip(id, 'waitingForThem')).join('') 
    : `<span class="pempty">—</span>`;
  
  const projectTags = personProjects.map(pr => 
    `<span class="pill" style="background:${pr.color};color:#000;border-color:transparent;font-size:9px;padding:1px 5px">${pr.name}</span>`
  ).join('');
  
  return `<div class="person-row" data-person="${p.id}">
    <div class="pname"><span class="pinit" style="background:${pColor(p)}">${p.initials}</span>${p.name}${projectTags ? '<span class="pprojects">' + projectTags + '</span>' : ''}</div>
    <div class="ptasks">${waitingForMeHtml}</div>
    <div class="ptasks">${waitingForThemHtml}</div>
  </div>`;
}

// Group people by project
function groupPeopleByProject(people) {
  const groups = new Map();
  const ungrouped = [];
  
  people.forEach(p => {
    const projects = p.projects || [];
    if (projects.length === 0) {
      ungrouped.push(p);
    } else {
      projects.forEach(pid => {
        const proj = store.projects[pid];
        if (!proj) return;
        if (!groups.has(pid)) groups.set(pid, { id: pid, name: proj.name, color: proj.color, people: [] });
        groups.get(pid).people.push(p);
      });
    }
  });
  
  if (ungrouped.length > 0) {
    groups.set('_ungrouped', { id: '_ungrouped', name: 'No project', color: null, people: ungrouped });
  }
  
  return Array.from(groups.values());
}

function renderPeople(){
  let people = [...viewData.people];
  const sorter = PEOPLE_SORTS[pSort.value] || PEOPLE_SORTS['tasks-desc'];
  const sortedPeople = people.sort(sorter);
  el('#peopleCountInfo').textContent = `${people.length} people`;
  
  const header = `<div class="person-row person-header">
    <div>Person</div>
    <div>I'm waiting on them</div>
    <div>They're waiting on me</div>
    <div></div>
  </div>`;
  
  const groupBy = pGroup.value;
  
  if (!groupBy) {
    // No grouping - flat list
    peopleList.innerHTML = `<div class="people-table">${header}${sortedPeople.map(renderPersonRow).join('')}</div>`;
  } else {
    // Grouped view
    const groups = groupPeopleByProject(sortedPeople);
    peopleList.innerHTML = `<div class="people-table">${header}${groups.map(g => {
      const isCollapsed = collapsedGroups.people.has(g.id);
      const colorDot = g.color ? `<span class="group-color" style="background:${g.color}"></span>` : '';
      return `<div class="group-section" data-group="${g.id}">
        <div class="group-header${isCollapsed ? ' collapsed' : ''}" data-act="toggleGroup" data-group="${g.id}">
          <i class="fas fa-chevron-down chevron"></i>
          ${colorDot}
          <span>${g.name}</span>
          <span class="group-count">${g.people.length}</span>
        </div>
        <div class="group-content${isCollapsed ? ' collapsed' : ''}">
          ${g.people.map(renderPersonRow).join('')}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  peopleList.onclick=e=>{
    // Group toggle
    if (e.target.closest('[data-act="toggleGroup"]')) {
      const groupId = e.target.closest('[data-group]').dataset.group;
      if (collapsedGroups.people.has(groupId)) {
        collapsedGroups.people.delete(groupId);
      } else {
        collapsedGroups.people.add(groupId);
      }
      renderPeople();
      return;
    }
    
    const target = e.target.closest('[data-act]');
    const act = target?.dataset.act;
    if(act==='addWithPerson'){ openTodoModal(null,null,target.dataset.pid); return; }
    if(act==='openAttach'){ openAttachModal({type:'person', personId:target.dataset.pid, side:target.dataset.side}); return; }
    if(act==='open') { openTodoModal(target.dataset.id); return; }
    if(e.target.classList.contains('xbtn')){ const wrap=e.target.closest('.ptask'); const pid=wrap.dataset.pid, side=wrap.dataset.side, tid=wrap.dataset.tid; const p=store.people[pid]; p[side]=p[side].filter(id=>id!==tid); recomputeTodoPeople(tid); save(); renderPeople(); renderTodos(); renderKanban(); return; }
    
    // Click on person row (not on task chips or buttons) opens edit modal
    const personRow = e.target.closest('.person-row:not(.person-header)');
    if (personRow && !e.target.closest('.ptask, .xbtn, button')) {
      const personId = personRow.dataset.person;
      if (personId) openPersonModal(personId);
    }
  };
}

/*** ====== KANBAN ====== ***/
const kbSelect=el('#kbSelect'), kanbanGrid=el('#kanbanGrid');
el('#btnAddBoard').onclick=()=>{ const name=prompt('Board name?'); if(!name) return; const id='kb'+nextId(); store.kanbans[id]={id,name,columns:[{id:'col-'+nextId(),name:'Backlog',todoIds:[]}]}; store.current.activeKanbanId=id; save(); renderKanban(); };
kbSelect.onchange=()=>{store.current.activeKanbanId=kbSelect.value; save(); updateBoardControls(); renderKanban();};

el('#btnEditBoard').onclick=()=>openBoardEditor();

function updateBoardControls() {
  const isDefaultBoard = store.current.activeKanbanId === 'default';
  el('#btnEditBoard').style.display = isDefaultBoard ? 'none' : '';
}

let pendingPlacement=null;

function renderKanban(){
  const boards=Object.values(store.kanbans);
  const allBoards = [{id:'default', name:'Default (By Status)'}].concat(boards);
  
  kbSelect.innerHTML=allBoards.map(k=>`<option value="${k.id}" ${store.current.activeKanbanId===k.id?'selected':''}>${k.name}</option>`).join('');
  if(!store.current.activeKanbanId){store.current.activeKanbanId='default'; save();}

  const isDefaultBoard = store.current.activeKanbanId === 'default';
  
  if (isDefaultBoard) {
    // Special handling for the default board - show todos by status using STATUS_DEFINITIONS
    const statusColumns = STATUS_DEFINITIONS.map(s => ({
      id: s.id,
      name: s.label,
      status: s.id
    }));
    
    kanbanGrid.innerHTML = statusColumns.map(col => {
      // Use viewData filtered todos (already filtered by global filters)
      let todos = viewData.todos.filter(t => t.status === col.status);
      
      const cards = todos.map(t => kanbanCard(t)).join('');
      return `<div class="column" data-col="${col.id}">
        <div class="colhead">
          <span>${col.name}</span>
          <div class="coltools">
            <span class="badge">${todos.length}</span>
          </div>
        </div>
        <div class="dropzone" data-col="${col.id}">${cards || '<div class="note">No todos here…</div>'}</div>
      </div>`;
    }).join('');
  } else {
    // Regular board handling
    const kb=store.kanbans[store.current.activeKanbanId];
    if (!kb) return;
    
    kanbanGrid.innerHTML=kb.columns.map(col=>{
      // Use viewData filtered todos (already filtered by global filters)
      const columnTodoIds = new Set(col.todoIds);
      let todos = viewData.todos.filter(t => columnTodoIds.has(t.id));
      
      const cards = todos.map(t=>kanbanCard(t)).join('');
      return `<div class="column" data-col="${col.id}">
        <div class="colhead">
          <span contenteditable="true" spellcheck="false" data-act="renameCol" data-col="${col.id}" title="Click to rename">${col.name}</span>
          <div class="coltools">
            <button class="pill action" data-col="${col.id}" data-act="attachToCol" title="Attach existing"><i class="fas fa-plus"></i></button>
            <button class="pill action" data-col="${col.id}" data-act="newToCol" title="New todo here"><i class="fas fa-file-medical"></i></button>
            <button class="pill" data-col="${col.id}" data-act="deleteCol" title="Delete column" style="background:#ff3b30;color:#fff"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="dropzone" data-col="${col.id}">${cards||'<div class="note">Drop here…</div>'}</div>
      </div>`;
    }).join('');
  }

  // Enhanced drag and drop with within-column sorting
  els('.card[kb]').forEach(c=>{ 
    c.draggable=true; 
    c.addEventListener('dragstart',ev=>{
      ev.dataTransfer.setData('text/plain',c.dataset.id); 
      c.classList.add('dragging'); 
      ev.dataTransfer.effectAllowed='move';
    }); 
    c.addEventListener('dragend',()=>c.classList.remove('dragging'));
    
    // Allow dropping on cards for reordering within column
    c.addEventListener('dragover',ev=>{
      if(c.classList.contains('dragging')) return;
      ev.preventDefault();
      c.classList.add('drag-over');
    });
    c.addEventListener('dragleave',()=>c.classList.remove('drag-over'));
    c.addEventListener('drop',ev=>{
      if(c.classList.contains('dragging')) return;
      ev.preventDefault();
      ev.stopPropagation();
      c.classList.remove('drag-over');
      const todoId=ev.dataTransfer.getData('text/plain');
      const targetId=c.dataset.id;
      moveInKanban(todoId, c.closest('.dropzone').dataset.col, targetId);
    });
  });
  
  els('.dropzone').forEach(z=>{ 
    z.addEventListener('dragover',ev=>{
      ev.preventDefault(); 
      z.classList.add('over');
    }); 
    z.addEventListener('dragleave',()=>z.classList.remove('over')); 
    z.addEventListener('drop',ev=>{
      ev.preventDefault(); 
      z.classList.remove('over'); 
      const todoId=ev.dataTransfer.getData('text/plain'); 
      moveInKanban(todoId,z.dataset.col);
    }); 
  });

  // inline column rename
  kanbanGrid.addEventListener('keydown', (e)=>{ if(e.target.dataset.act==='renameCol' && e.key==='Enter'){ e.preventDefault(); e.target.blur(); }});
  kanbanGrid.addEventListener('blur', (e)=>{ if(e.target.dataset.act==='renameCol'){ const colId=e.target.dataset.col; const kb=store.kanbans[store.current.activeKanbanId]; const col=kb.columns.find(c=>c.id===colId); if(col){ col.name=e.target.textContent.trim()||col.name; save(); } } }, true);

  // delete column button
  kanbanGrid.addEventListener('click', (e)=>{ if(e.target.dataset.act==='deleteCol'){ const colId=e.target.dataset.col; const kb=store.kanbans[store.current.activeKanbanId]; if(kb.columns.length<=1) return alert('Need at least one column'); const i=kb.columns.findIndex(c=>c.id===colId); if(i>=0){ kb.columns.splice(i,1); save(); renderKanban(); } } });
  
  updateBoardControls();
}
function kanbanCard(t){
  const p=store.projects[t.projectId];
  const blocked = isTodoBlocked(t.id);
  const cardClasses = ['card'];
  if (blocked) cardClasses.push('blocked');
  const blockedBadge = blocked ? '<span class="badge badge-blocked">Blocked</span>' : '';
  const safeTitle = escapeHtml(t.title || '');
  const durationMinutes = getDurationMinutes(t);
  const durationBadge = durationMinutes > 0 ? `<span class="badge badge-duration" title="Estimated duration: ${formatDuration(durationMinutes)}">⏱ ${formatDuration(durationMinutes)}</span>` : '';
  return `<div class="${cardClasses.join(' ')}" kb data-id="${t.id}" data-act="openModal" style="cursor:pointer" title="Click to edit todo">
    <div class="cardhead"><div class="cardtitle tiny">${safeTitle}</div></div>
    <div class="toolbar"><span class="pill"><span class="dot" style="color:${p?.color||'var(--muted)'}"></span>${p?.name||'—'}</span>${durationBadge ? ' '+durationBadge : ''}${blockedBadge ? ' '+blockedBadge : ''}<span class="badge">${fmtDue(t.due)}</span><span class="badge">${t.status}</span></div>
  </div>`;
}
function moveInKanban(todoId, toColId, targetTodoId = null){ 
  const isDefaultBoard = store.current.activeKanbanId === 'default';
  
  if (isDefaultBoard) {
    // For default board, update the todo's status
    const statusMap = {'todo': 'todo', 'in-progress': 'in-progress', 'waiting': 'waiting', 'review': 'review', 'done': 'done'};
    if (statusMap[toColId] && store.todos[todoId]) {
      store.todos[todoId].status = statusMap[toColId];
      save();
      renderKanban();
      renderTodos(); // Also update todos view since status changed
    }
  } else {
    // Regular board handling with position support
    const kb = store.kanbans[store.current.activeKanbanId]; 
    const sourceCol = kb.columns.find(c => c.todoIds.includes(todoId));
    const targetCol = kb.columns.find(c => c.id === toColId); 
    
    if (!targetCol) return;
    
    // Remove from source column
    if (sourceCol) {
      const sourceIndex = sourceCol.todoIds.indexOf(todoId);
      if (sourceIndex >= 0) sourceCol.todoIds.splice(sourceIndex, 1);
    }
    
    // Add to target column at specific position
    if (targetTodoId && targetCol.todoIds.includes(targetTodoId)) {
      // Insert before the target todo
      const targetIndex = targetCol.todoIds.indexOf(targetTodoId);
      targetCol.todoIds.splice(targetIndex, 0, todoId);
    } else {
      // Add to end if no specific target or target not found
      if (!targetCol.todoIds.includes(todoId)) {
        targetCol.todoIds.push(todoId);
      }
    }
    
    save(); 
    renderKanban();
  }
}
kanbanGrid.addEventListener('click',e=>{ 
  if(e.target.dataset.act==='edit' || e.target.dataset.act==='openModal') {
    openTodoModal(e.target.dataset.id); 
  }
  
  // Check if clicked element is a kanban card or inside one
  const cardElement = e.target.closest('[kb]');
  if(cardElement && cardElement.dataset.id && !e.target.closest('button')) {
    openTodoModal(cardElement.dataset.id);
  }
  
  // Disable these actions for default board
  if (store.current.activeKanbanId !== 'default') {
    if(e.target.dataset.act==='attachToCol'){ openAttachModal({type:'kanban', boardId:store.current.activeKanbanId, colId:e.target.dataset.col}); } 
    if(e.target.dataset.act==='newToCol'){ pendingPlacement={boardId:store.current.activeKanbanId, colId:e.target.dataset.col}; openTodoModal(); }
  }
});

function openBoardEditor(){ 
  if (store.current.activeKanbanId === 'default') return; // Can't edit default board
  const kb=store.kanbans[store.current.activeKanbanId]; if(!kb) return; el('#bName').value=kb.name; const holder=el('#bCols'); holder.innerHTML = kb.columns.map(c=> `<div class="row" data-col="${c.id}"><div><input type="text" value="${c.name}" data-act="colName"></div><div><button class="pill" data-act="colUp"><i class="fas fa-arrow-up"></i></button> <button class="pill" data-act="colDown"><i class="fas fa-arrow-down"></i></button> <button class="pill" data-act="colDel" style="background:#ff3b30;color:#fff"><i class="fas fa-trash"></i></button></div></div>`).join(''); el('#dlgBoard').showModal();
}
el('#btnAddCol').onclick=()=>{ const kb=store.kanbans[store.current.activeKanbanId]; const id='col-'+nextId(); kb.columns.push({id,name:'New Column',todoIds:[]}); save(); openBoardEditor(); };
const saveBoardHandler = (e)=>{ e.preventDefault(); const kb=store.kanbans[store.current.activeKanbanId]; kb.name = el('#bName').value.trim()||kb.name; // names
  els('#bCols .row').forEach(r=>{ const id=r.dataset.col; const col=kb.columns.find(c=>c.id===id); if(col){ col.name = el('input[data-act="colName"]', r).value.trim()||col.name; }}); save(); el('#dlgBoard').close(); renderKanban(); };
el('#btnSaveBoard').onclick=saveBoardHandler;
// Add Enter key handler for Board modal
el('#dlgBoard').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveBoardHandler(e);
  }
});
el('#bCols')?.addEventListener('click',(e)=>{ const kb=store.kanbans[store.current.activeKanbanId]; const row=e.target.closest('.row'); if(!row) return; const id=row.dataset.col; const i=kb.columns.findIndex(c=>c.id===id); if(e.target.dataset.act==='colUp' && i>0){ const [c]=kb.columns.splice(i,1); kb.columns.splice(i-1,0,c); openBoardEditor(); }
  if(e.target.dataset.act==='colDown' && i<kb.columns.length-1){ const [c]=kb.columns.splice(i,1); kb.columns.splice(i+1,0,c); openBoardEditor(); }
  if(e.target.dataset.act==='colDel'){ if(kb.columns.length<=1) return alert('Need at least one column'); kb.columns.splice(i,1); openBoardEditor(); }
});

/*** ====== TODO MODAL ====== ***/
const dlgTodo=el('#dlgTodo');
const tId=el('#tId'), tTitle=el('#tTitle'), tNotes=el('#tNotes'), tProject=el('#tProject'), tDue=el('#tDue'), tStatus=el('#tStatus'), tDurationValue=el('#tDurationValue'), tDurationUnit=el('#tDurationUnit'), selWaitingOn=el('#selWaitingOn'), selWaitingOnMe=el('#selWaitingOnMe'), eisenForm=el('#eisenForm');

// Context-aware FAB button
el('#fabAdd').onclick=()=>{
  const tab = store.current.tab;
  if (tab === 'projects') {
    el('#dlgProject').showModal();
  } else if (tab === 'people') {
    openPersonModal();
  } else {
    openTodoModal();
  }
};

// Close dialogs when clicking on backdrop
els('dialog').forEach(dialog => {
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  });
});

function setEisenUI(e){ els('.d', eisenForm).forEach(b=>{ const k=b.dataset.k; b.classList.toggle('on', !!e[k]); }); }
eisenForm.addEventListener('click', (ev)=>{ const btn=ev.target.closest('.d'); if(!btn) return; btn.classList.toggle('on'); });
function openTodoModal(id=null,presetProjectId=null,presetPersonId=null){ 
  refreshProjectSelects(); refreshPeopleSelects(); 
  if(id){ 
    const t=store.todos[id]; 
    tId.value=t.id; tTitle.value=t.title||''; tNotes.value=t.notes||''; tProject.value=t.projectId||''; tDue.value=t.due||''; tStatus.value=t.status||'todo'; 
    const waitingOnIds=Object.values(store.people).filter(p=>p.waitingForMe?.includes(id)).map(p=>p.id); 
    const waitingOnMeIds=Object.values(store.people).filter(p=>p.waitingForThem?.includes(id)).map(p=>p.id); 
    setMultiSel(selWaitingOn,new Set(waitingOnIds)); setMultiSel(selWaitingOnMe,new Set(waitingOnMeIds)); 
    setEisenUI(t.eisen||{impact:0,important:0,urgent:0}); 
    const durationMinutes = getDurationMinutes(t);
    if(durationMinutes > 0){
      const best = bestDurationUnit(durationMinutes);
      tDurationValue.value = best.value;
      tDurationUnit.value = best.unit;
    } else {
      tDurationValue.value = '';
      tDurationUnit.value = 'minutes';
    }
    el('#todoFormTitle').textContent='Edit Todo'; 
  el('#btnDeleteTodo').style.display='block';
  el('#btnArchiveTodo').style.display = t.archived ? 'none' : 'inline-block';
  el('#btnUnarchiveTodo').style.display = t.archived ? 'inline-block' : 'none';
  }else{ 
    tId.value=''; el('#todoForm').reset(); tProject.value=presetProjectId||''; 
    tDurationValue.value='';
    tDurationUnit.value='minutes';
    setMultiSel(selWaitingOn,new Set(presetPersonId?[presetPersonId]:[])); setMultiSel(selWaitingOnMe,new Set()); 
    setEisenUI({impact:0,important:0,urgent:0}); 
    el('#todoFormTitle').textContent='New Todo'; 
  el('#btnDeleteTodo').style.display='none';
  el('#btnArchiveTodo').style.display = 'none';
  el('#btnUnarchiveTodo').style.display = 'none';
  } 
  dlgTodo.showModal(); 
}
function refreshProjectSelects(){ const opts=`<option value="">(none)</option>`+Object.values(store.projects).map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); tProject.innerHTML=opts; el('#aProject').innerHTML=`<option value="">All projects</option>`+Object.values(store.projects).map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); }
function refreshPeopleSelects(){ const options=Object.values(store.people).map(p=>`<option value="${p.id}">${p.name} (${p.initials})</option>`).join(''); selWaitingOn.innerHTML=options; selWaitingOnMe.innerHTML=options; el('#aPerson').innerHTML=`<option value="">All people</option>`+Object.values(store.people).map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); }
function setMultiSel(selectEl,set){Array.from(selectEl.options).forEach(o=>o.selected=set.has(o.value));}
function getMultiSel(selectEl){return Array.from(selectEl.selectedOptions).map(o=>o.value);} 
const saveTodoHandler = e=>{
  e.preventDefault();
  const isEdit=!!tId.value;
  const id=isEdit?tId.value:nextId();
  const projectId=tProject.value||'';
  const waitingOn=new Set(getMultiSel(selWaitingOn));
  const waitingOnMe=new Set(getMultiSel(selWaitingOnMe));
  const ev=[...els('.d',eisenForm)].reduce((a,b)=>{
    a[b.dataset.k]=b.classList.contains('on')?1:0;
    return a;
  },{impact:0,important:0,urgent:0});
  const archived = isEdit ? store.todos[id].archived || false : false;
  const estimatedDurationMinutes = normalizeDurationInput(tDurationValue.value, tDurationUnit.value);
  const todo={
    id,
    title:tTitle.value.trim(),
    notes:tNotes.value.trim(),
    projectId,
    people:[...new Set([...waitingOn,...waitingOnMe])],
    tags:(el('#tTags')?.value||'').split(',').map(s=>s.trim()).filter(Boolean),
    eisen:ev,
    due:tDue.value||'',
    status:tStatus.value,
    created:isEdit?store.todos[id].created:Date.now(),
    archived,
    estimatedDurationMinutes
  };
  store.todos[id]=todo;
  Object.values(store.projects).forEach(p=>{
    const has=p.todoIds?.includes(id);
    if(p.id===projectId && !has){(p.todoIds||(p.todoIds=[])).push(id);}
    if(p.id!==projectId && has){p.todoIds.splice(p.todoIds.indexOf(id),1);}
  });
  Object.values(store.people).forEach(p=>{
    p.waitingForMe=(p.waitingForMe||[]).filter(tid=>tid!==id);
    p.waitingForThem=(p.waitingForThem||[]).filter(tid=>tid!==id);
    if(waitingOn.has(p.id)) (p.waitingForMe||=[]).push(id);
    if(waitingOnMe.has(p.id)) (p.waitingForThem||[]).push(id);
  });
  if(pendingPlacement && !isEdit){
    moveInKanban(id, pendingPlacement.colId);
    pendingPlacement=null;
  }
  save();
  dlgTodo.close();
  render(true);
};
el('#btnSaveTodo').onclick=saveTodoHandler;

// Archive/Unarchive handlers
el('#btnArchiveTodo').onclick = e => {
  e.preventDefault();
  const id = tId.value;
  if (!id || !store.todos[id]) return;
  store.todos[id].archived = true;
  save();
  dlgTodo.close();
  render(true);
};
el('#btnUnarchiveTodo').onclick = e => {
  e.preventDefault();
  const id = tId.value;
  if (!id || !store.todos[id]) return;
  store.todos[id].archived = false;
  save();
  dlgTodo.close();
  render(true);
};

// Clear multi-select handlers
el('#btnClearWaitingOn').onclick = () => {
  Array.from(el('#selWaitingOn').options).forEach(option => option.selected = false);
};

el('#btnClearWaitingOnMe').onclick = () => {
  Array.from(el('#selWaitingOnMe').options).forEach(option => option.selected = false);
};

// Delete todo handler
el('#btnDeleteTodo').onclick = e => {
  e.preventDefault();
  const id = tId.value;
  if (!id) return;
  
  const todo = store.todos[id];
  const confirmMsg = `Are you sure you want to delete "${todo?.title || 'this todo'}"?\n\nThis action cannot be undone.`;
  
  if (confirm(confirmMsg)) {
    deleteTodo(id);
    dlgTodo.close();
    render(true);
  }
};

// Add Enter key handler for Todo modal
dlgTodo.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    saveTodoHandler(e);
  }
});

/*** ====== ATTACH MODAL ====== ***/
const dlgAttach=el('#dlgAttach');
const aSearch=el('#aSearch'), aProject=el('#aProject'), aPerson=el('#aPerson'), aStatus=el('#aStatus'), aSort=el('#aSort'), attachList=el('#attachList');
[aSearch,aProject,aPerson,aStatus,aSort].forEach(c=>c.addEventListener('input',renderAttachList));
let attachCtx=null;
function openAttachModal(ctx){ attachCtx=ctx; const title=ctx.type==='person' ? `Attach tasks → ${store.people[ctx.personId]?.name} · ${ctx.side==='waitingForMe'?'I’m waiting on them':'They’re waiting on me'}` : `Attach tasks → Board “${store.kanbans[ctx.boardId]?.name}”, Column “${store.kanbans[ctx.boardId]?.columns.find(c=>c.id===ctx.colId)?.name}”`; el('#attachTitle').textContent=title; refreshProjectSelects(); refreshPeopleSelects(); aSearch.value=''; aProject.value=''; aPerson.value=''; aStatus.value=''; aSort.value='due-asc'; renderAttachList(); dlgAttach.showModal(); }
function renderAttachList(){ let items=Object.values(store.todos); const q=aSearch.value.trim().toLowerCase(); if(q){ items=items.filter(t=>universalHaystack(t).includes(q)); } const proj=aProject.value; if(proj) items=items.filter(t=>t.projectId===proj); const person=aPerson.value; if(person) items=items.filter(t=>(t.people||[]).includes(person)); const st=aStatus.value; if(st) items=items.filter(t=>t.status===st); if(attachCtx?.type==='person'){ const p=store.people[attachCtx.personId]; const arr=(p?.[attachCtx.side]||[]); items=items.filter(t=>!arr.includes(t.id)); } else if(attachCtx?.type==='kanban'){ const kb=store.kanbans[attachCtx.boardId]; const set=new Set(kb?.columns.flatMap(c=>c.todoIds)||[]); items=items.filter(t=>!set.has(t.id)); }
  const sorter=SORTS[aSort.value]||SORTS['due-asc']; items.sort(sorter);
  el('#aCount').textContent=`${items.length} candidates`;
  attachList.innerHTML=items.map(t=>{ const p=store.projects[t.projectId]; const durationMinutes=getDurationMinutes(t); const durationBadge=durationMinutes>0 ? `<span class="badge badge-duration" title="Estimated duration: ${formatDuration(durationMinutes)}">⏱ ${formatDuration(durationMinutes)}</span>` : ''; const safeTitle=escapeHtml(t.title||''); return `<div class="todoRow" data-id="${t.id}">
      <input type="checkbox" data-id="${t.id}" />
      <div class="title">${safeTitle}${durationBadge ? ' '+durationBadge : ''}</div>
      <div class="hiu">
        <span class="d h ${t.eisen?.impact?'on':''}"></span>
        <span class="d i ${t.eisen?.important?'on':''}"></span>
        <span class="d u ${t.eisen?.urgent?'on':''}"></span>
      </div>
      <div class="pill"><span class="dot" style="color:${p?.color||'var(--muted)'}"></span>${p?.name||'—'}</div>
      <div class="badge">${fmtDue(t.due)}</div>
      <div class="actions"></div>
    </div>`; }).join(''); }
const attachConfirmHandler = e=>{ e.preventDefault(); const ids=els('input[type="checkbox"]:checked',attachList).map(c=>c.dataset.id); if(!ids.length){dlgAttach.close(); return;} if(attachCtx.type==='person'){ const p=store.people[attachCtx.personId]; const arr=(p[attachCtx.side] ||= []); ids.forEach(id=>{ if(!arr.includes(id)) arr.push(id); recomputeTodoPeople(id); }); save(); dlgAttach.close(); renderPeople(); renderTodos(); } else if(attachCtx.type==='kanban'){ ids.forEach(id=>moveInKanban(id, attachCtx.colId)); dlgAttach.close(); } };
el('#btnAttachConfirm').onclick=attachConfirmHandler;
// Add Enter key handler for Attach modal
el('#dlgAttach').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    attachConfirmHandler(e);
  }
});

/*** ====== COMMAND PALETTE ====== ***/
const kbar=el('#kbar'), kinput=el('#kinput'), klist=el('#klist');
const CMDS=[
  {label:'New todo', run:()=>openTodoModal()},
  {label:'Go: Todos', run:()=>setTab('todos')},
  {label:'Go: Projects', run:()=>setTab('projects')},
  {label:'Go: People', run:()=>setTab('people')},
  {label:'Go: Kanban', run:()=>setTab('kanban')},
  {label:'New project', run:()=>el('#dlgProject').showModal()},
  {label:'New person', run:()=>el('#dlgPerson').showModal()},
  {label:'New board', run:()=>el('#btnAddBoard').click()},
  {label:'Edit current board', run:()=>openBoardEditor()},
  {label:'Export backup', run:()=>exportBackup()},
  {label:'Import backup', run:()=>el('#fileImport').click()},
  {label:'Recover from auto-backup', run:()=>recoverAutoBackup()},
  {label:'Clear all filters', run:()=>{ btnClearFilters.click(); }},
  {label:'Focus search', run:()=>{ setTab('todos'); globalSearch.focus(); }},
];
let ksel=0; function openK(){ kbar.classList.add('open'); kbar.setAttribute('aria-hidden','false'); kinput.value=''; renderK(''); kinput.focus(); }
function closeK(){ kbar.classList.remove('open'); kbar.setAttribute('aria-hidden','true'); }
function renderK(q){ const items=CMDS.filter(c=>c.label.toLowerCase().includes(q.toLowerCase())); ksel=0; klist.innerHTML=items.map((c,i)=>`<div class="kitem ${i===0?'sel':''}" data-i="${i}">${c.label}<span class="tiny muted">↩</span></div>`).join(''); }
window.addEventListener('keydown',(e)=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); if(kbar.classList.contains('open')) closeK(); else openK(); }});
kbar.addEventListener('click',(e)=>{ if(e.target===kbar) closeK(); });
kinput.addEventListener('input',()=>renderK(kinput.value));
kinput.addEventListener('keydown',(e)=>{ const items=Array.from(klist.children); if(e.key==='ArrowDown'){ e.preventDefault(); ksel=Math.min(ksel+1, items.length-1); items.forEach((n,i)=>n.classList.toggle('sel',i===ksel)); }
  if(e.key==='ArrowUp'){ e.preventDefault(); ksel=Math.max(0, ksel-1); items.forEach((n,i)=>n.classList.toggle('sel',i===ksel)); }
  if(e.key==='Enter'){ e.preventDefault(); const q=kinput.value.toLowerCase(); const matches=CMDS.filter(c=>c.label.toLowerCase().includes(q)); if(matches[ksel]){ closeK(); matches[ksel].run(); }}
  if(e.key==='Escape'){ closeK(); }
});

/*** ====== CANVAS SYSTEM ====== ***/
let currentCanvasView = 'default';
let draggingEntity = null;
let dragOffset = {x: 0, y: 0};
let canvasTransform = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let clickStart = { x: 0, y: 0, time: 0 };
let hasMoved = false;

function getCurrentCanvasView() {
  if (!store.canvasViews) store.canvasViews = {};
  if (!store.canvasViews[currentCanvasView]) {
    store.canvasViews[currentCanvasView] = {
      id: currentCanvasView,
      name: currentCanvasView === 'default' ? 'Default Canvas' : `Canvas ${currentCanvasView}`,
      entities: {}
    };
  }
  return store.canvasViews[currentCanvasView];
}

function addEntityToCanvas(entityType, entityId) {
  const view = getCurrentCanvasView();
  const key = `${entityType}:${entityId}`;
  
  // Don't add if already exists
  if (view.entities[key]) return;
  
  // Add at random position
  view.entities[key] = {
    x: 100 + Math.random() * 400,
    y: 100 + Math.random() * 300
  };
  
  save();
  renderCanvas();
}

function renderCanvas() {
  const container = el('#canvasContainer');
  const canvas = el('#mainCanvas');
  const viewport = el('#canvasViewport');
  const view = getCurrentCanvasView();
  
  // Clear existing entities
  els('.canvas-entity').forEach(el => el.remove());
  
  // Apply current transform
  updateCanvasTransform();
  
  // Render entities
  Object.entries(view.entities).forEach(([key, pos]) => {
    const [type, id] = key.split(':');
    let entity, title, meta;
    
    if (type === 'todo' && store.todos[id]) {
      entity = store.todos[id];
      title = entity.title;
      meta = `${entity.status} • ${store.projects[entity.projectId]?.name || 'No project'}`;
    } else if (type === 'project' && store.projects[id]) {
      entity = store.projects[id];
      title = entity.name;
      meta = `${entity.todoIds?.length || 0} tasks`;
    } else {
      return; // Entity doesn't exist anymore
    }
    
    const entityEl = document.createElement('div');
    entityEl.className = `canvas-entity ${type}`;
    entityEl.style.left = pos.x + 'px';
    entityEl.style.top = pos.y + 'px';
    entityEl.dataset.key = key;
    
    entityEl.innerHTML = `
      <div class="canvas-entity-title">${title}</div>
      <div class="canvas-entity-meta">${meta}</div>
    `;
    
    // Add drag and click functionality
    entityEl.addEventListener('mousedown', startEntityInteraction);
    
    el('#canvasViewport').appendChild(entityEl);
  });
  
  // Update canvas view selector
  updateCanvasViewSelector();
}

// Enhanced interaction system for canvas entities
function startEntityInteraction(e) {
  e.preventDefault();
  e.stopPropagation();
  
  clickStart = {
    x: e.clientX,
    y: e.clientY, 
    time: Date.now()
  };
  hasMoved = false;
  
  draggingEntity = e.currentTarget;
  
  const rect = draggingEntity.getBoundingClientRect();
  const viewportRect = el('#canvasViewport').getBoundingClientRect();
  
  dragOffset = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  
  document.addEventListener('mousemove', dragEntity);
  document.addEventListener('mouseup', endEntityInteraction);
}

function dragEntity(e) {
  if (!draggingEntity) return;
  
  const moveDistance = Math.abs(e.clientX - clickStart.x) + Math.abs(e.clientY - clickStart.y);
  if (moveDistance > 5) {
    hasMoved = true;
    if (!draggingEntity.classList.contains('dragging')) {
      draggingEntity.classList.add('dragging');
    }
  }
  
  if (hasMoved) {
    const viewportRect = el('#canvasViewport').getBoundingClientRect();
    const x = (e.clientX - viewportRect.left) / canvasTransform.scale - dragOffset.x;
    const y = (e.clientY - viewportRect.top) / canvasTransform.scale - dragOffset.y;
    
    draggingEntity.style.left = x + 'px';
    draggingEntity.style.top = y + 'px';
  }
}

function endEntityInteraction(e) {
  if (!draggingEntity) return;
  
  const key = draggingEntity.dataset.key;
  const view = getCurrentCanvasView();
  
  if (hasMoved) {
    // Save new position
    view.entities[key] = {
      x: parseInt(draggingEntity.style.left),
      y: parseInt(draggingEntity.style.top)
    };
    save();
  } else {
    // Handle click (open modal)
    const clickDuration = Date.now() - clickStart.time;
    if (clickDuration < 300) { // Short click
      openEntityModal(key);
    }
  }
  
  draggingEntity.classList.remove('dragging');
  draggingEntity = null;
  
  document.removeEventListener('mousemove', dragEntity);
  document.removeEventListener('mouseup', endEntityInteraction);
}

function openEntityModal(key) {
  const [type, id] = key.split(':');
  
  if (type === 'todo' && store.todos[id]) {
    // Open todo modal for editing
    const t = store.todos[id];
    const dlgTodo = el('#dlgTodo');
    const tId = el('#tId');
    const tTitle = el('#tTitle');
    const tNotes = el('#tNotes');
    const tProject = el('#tProject');
    const tDue = el('#tDue');
    const tStatus = el('#tStatus');
    
    tId.value = t.id;
    tTitle.value = t.title || '';
    tNotes.value = t.notes || '';
    tProject.value = t.projectId || '';
    tDue.value = t.due || '';
    tStatus.value = t.status || 'todo';
    
    // Set eisen values
    const eisenForm = el('#eisenForm');
    if (eisenForm && t.eisen) {
      els('.d', eisenForm).forEach(d => {
        const key = d.dataset.k;
        d.classList.toggle('on', !!t.eisen[key]);
      });
    }
    
    dlgTodo.showModal();
  } else if (type === 'project') {
    // Switch to projects view and highlight the project
    setTab('projects');
  }
}

function updateCanvasViewSelector() {
  const select = el('#canvasViewSelect');
  const views = Object.values(store.canvasViews || {});
  
  select.innerHTML = views.map(v => 
    `<option value="${v.id}" ${v.id === currentCanvasView ? 'selected' : ''}>${v.name}</option>`
  ).join('');
  
  // Show/hide delete button based on whether it's the default canvas
  const deleteBtn = el('#btnDeleteCanvasView');
  if (deleteBtn) {
    deleteBtn.style.display = currentCanvasView === 'default' ? 'none' : 'grid';
  }
}

function updateCanvasTransform() {
  const viewport = el('#canvasViewport');
  if (viewport) {
    viewport.style.transform = `translate(${canvasTransform.x}px, ${canvasTransform.y}px) scale(${canvasTransform.scale})`;
  }
}

function getCanvasBounds() {
  const view = getCurrentCanvasView();
  const positions = Object.values(view.entities);
  
  if (positions.length === 0) {
    return { minX: 0, minY: 0, maxX: 1200, maxY: 800 };
  }
  
  const minX = Math.min(...positions.map(p => p.x)) - 100;
  const minY = Math.min(...positions.map(p => p.y)) - 100;
  const maxX = Math.max(...positions.map(p => p.x)) + 300;
  const maxY = Math.max(...positions.map(p => p.y)) + 200;
  
  return { minX, minY, maxX, maxY };
}

function fitCanvasToContent() {
  const canvas = el('#mainCanvas');

  const container = el('#canvasContainer');
  const bounds = getCanvasBounds();
  
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  
  const scaleX = container.offsetWidth / contentWidth;
  const scaleY = container.offsetHeight / contentHeight;
  
  canvasTransform.scale = Math.min(scaleX, scaleY, 1) * 0.9; // 90% to add padding
  canvasTransform.x = -bounds.minX * canvasTransform.scale + 50;
  canvasTransform.y = -canvas.height -bounds.minY * canvasTransform.scale + 50;
  
  updateCanvasTransform();
}

function showTodoSelector(callback) {
  const todos = Object.values(store.todos);
  const view = getCurrentCanvasView();
  
  // Filter out already added todos
  const availableTodos = todos.filter(t => !view.entities[`todo:${t.id}`]);
  
  if (availableTodos.length === 0) {
    alert('All todos are already on this canvas!');
    return;
  }
  
  const todoId = prompt('Select todo ID:\n' + 
    availableTodos.map(t => `${t.id}: ${t.title}`).join('\n') +
    '\n\nEnter todo ID:');
  
  if (todoId && availableTodos.find(t => t.id === todoId)) {
    callback('todo', todoId);
  }
}

function showProjectSelector(callback) {
  const projects = Object.values(store.projects);
  const view = getCurrentCanvasView();
  
  // Filter out already added projects
  const availableProjects = projects.filter(p => !view.entities[`project:${p.id}`]);
  
  if (availableProjects.length === 0) {
    alert('All projects are already on this canvas!');
    return;
  }
  
  const projectId = prompt('Select project ID:\n' + 
    availableProjects.map(p => `${p.id}: ${p.name}`).join('\n') +
    '\n\nEnter project ID:');
  
  if (projectId && availableProjects.find(p => p.id === projectId)) {
    callback('project', projectId);
  }
}

// Canvas event listeners
el('#btnAddTodoToCanvas')?.addEventListener('click', () => {
  showTodoSelector(addEntityToCanvas);
});

el('#btnAddProjectToCanvas')?.addEventListener('click', () => {
  showProjectSelector(addEntityToCanvas);
});

el('#btnAddAllTodos')?.addEventListener('click', () => {
  const todos = Object.values(store.todos);
  const view = getCurrentCanvasView();
  
  todos.forEach(todo => {
    const key = `todo:${todo.id}`;
    if (!view.entities[key]) {
      addEntityToCanvas('todo', todo.id);
    }
  });
});

el('#canvasViewSelect')?.addEventListener('change', (e) => {
  currentCanvasView = e.target.value;
  canvasTransform = { x: 0, y: 0, scale: 1 }; // Reset transform on view change
  
  // Update delete button visibility
  const deleteBtn = el('#btnDeleteCanvasView');
  if (deleteBtn) {
    deleteBtn.style.display = currentCanvasView === 'default' ? 'none' : 'grid';
  }
  
  renderCanvas();
});

el('#btnAddCanvasView')?.addEventListener('click', () => {
  const name = prompt('Canvas view name:');
  if (!name) return;
  
  const id = 'canvas_' + Date.now();
  store.canvasViews[id] = {
    id,
    name,
    entities: {}
  };
  
  currentCanvasView = id;
  save();
  renderCanvas();
});

// Delete canvas view (except default)
el('#btnDeleteCanvasView')?.addEventListener('click', () => {
  if (currentCanvasView === 'default') {
    alert('Cannot delete the default canvas');
    return;
  }
  
  const view = store.canvasViews[currentCanvasView];
  if (!view) return;
  
  if (!confirm(`Delete canvas "${view.name}"?`)) return;
  
  delete store.canvasViews[currentCanvasView];
  currentCanvasView = 'default';
  save();
  renderCanvas();
});

// Create canvas from visible todos in todos view
el('#btnCreateCanvasFromTodos')?.addEventListener('click', () => {
  const name = prompt('Canvas name:', 'Filtered Todos');
  if (!name) return;
  
  // Get currently visible todos from viewData
  const visibleTodos = [...viewData.todos];
  
  if (visibleTodos.length === 0) {
    alert('No todos to add to canvas. Adjust your filters to show todos.');
    return;
  }
  
  const id = 'canvas_' + Date.now();
  const entities = {};
  
  // Arrange todos in a grid
  const cols = Math.ceil(Math.sqrt(visibleTodos.length));
  visibleTodos.forEach((todo, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    entities[`todo:${todo.id}`] = {
      x: col * 300 + 50,
      y: row * 200 + 50
    };
  });
  
  store.canvasViews[id] = {
    id,
    name,
    entities
  };
  
  // Switch to canvas view and select the new canvas
  currentCanvasView = id;
  setTab('canvas');
  save();
});

// Toggle canvas fullscreen (both custom and browser fullscreen)
el('#btnCanvasFullscreen')?.addEventListener('click', async () => {
  const body = document.body;
  const isFullscreen = body.classList.contains('canvas-fullscreen');
  
  if (isFullscreen) {
    // Exit both custom and browser fullscreen
    body.classList.remove('canvas-fullscreen');
    el('#btnCanvasFullscreen').title = 'Toggle fullscreen';
    
    // Exit browser fullscreen
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  } else {
    // Enter both custom and browser fullscreen
    body.classList.add('canvas-fullscreen');
    el('#btnCanvasFullscreen').title = 'Exit fullscreen';
    
    // Enter browser fullscreen
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.warn('Could not enter browser fullscreen:', err);
    }
  }
  
  // Re-render canvas to adjust to new dimensions
  setTimeout(() => {
    renderCanvas();
  }, 100);
});

// Listen for browser fullscreen changes (e.g., user presses ESC or F11)
document.addEventListener('fullscreenchange', () => {
  const body = document.body;
  
  // If browser exited fullscreen, also exit our custom fullscreen
  if (!document.fullscreenElement && body.classList.contains('canvas-fullscreen')) {
    body.classList.remove('canvas-fullscreen');
    el('#btnCanvasFullscreen').title = 'Toggle fullscreen';
    setTimeout(() => {
      renderCanvas();
    }, 100);
  }
});

// Reset canvas view to top left
el('#btnCanvasReset')?.addEventListener('click', () => {
  const canvas = el('#mainCanvas');
  
  canvasTransform.scale = 1;

  // Find top-left-most entity
  const view = getCurrentCanvasView();
  const positions = Object.values(view.entities);
  if (positions.length === 0) {
    canvasTransform.x = 0;
    canvasTransform.y = -canvas.height;;
    canvasTransform.scale = 1;
  } else {
    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    canvasTransform.x = -minX + 50;
    canvasTransform.y = -canvas.height - minY;
    canvasTransform.scale = 1;
  }
  updateCanvasTransform();
  renderCanvas();
});

// Zoom and pan event listeners
const canvasContainer = el('#canvasContainer');

// Trackpad detection: trackpads typically have smaller, more frequent deltaY values
// We'll detect this by checking if deltas are small and precise (< 50 and not multiples of 100)
let isTrackpad = null;
let wheelSamples = [];

// Mouse wheel zoom OR trackpad pan (smart detection)
canvasContainer?.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  // Detect trackpad vs mouse wheel based on delta characteristics
  if (isTrackpad === null && wheelSamples.length < 5) {
    // Collect samples to determine input device
    wheelSamples.push(Math.abs(e.deltaY));
    
    if (wheelSamples.length === 5) {
      // Trackpads: small, variable deltas (usually < 50)
      // Mouse wheels: large, discrete deltas (usually 100, 120, or multiples)
      const avgDelta = wheelSamples.reduce((a, b) => a + b, 0) / wheelSamples.length;
      const hasSmallDeltas = wheelSamples.every(d => d < 50);
      const hasVariableDeltas = new Set(wheelSamples).size > 2;
      
      isTrackpad = hasSmallDeltas && hasVariableDeltas;
      console.log('Input device detected:', isTrackpad ? 'Trackpad' : 'Mouse wheel', 
                  '(avg delta:', avgDelta.toFixed(1), ')');
    }
  }
  
  if (isTrackpad) {
    // TRACKPAD: Check if user wants to zoom (Cmd/Ctrl held) or pan
    if (e.ctrlKey || e.metaKey) {
      // Cmd/Ctrl + trackpad scroll = ZOOM (pinch gesture)
      const rect = canvasContainer.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY > 0 ? 0.98 : 1.02;
      const newScale = Math.max(0.1, Math.min(3, canvasTransform.scale * zoomFactor));
      
      // Zoom towards mouse position
      const scaleRatio = newScale / canvasTransform.scale;
      canvasTransform.x = mouseX - (mouseX - canvasTransform.x) * scaleRatio;
      canvasTransform.y = mouseY - (mouseY - canvasTransform.y) * scaleRatio;
      canvasTransform.scale = newScale;
      
      updateCanvasTransform();
    } else {
      // Regular trackpad scroll = PAN (two-finger pan)
      const panSpeed = 1.5; // Adjust sensitivity
      canvasTransform.x -= e.deltaX * panSpeed;
      canvasTransform.y -= e.deltaY * panSpeed;
      updateCanvasTransform();
    }
  } else if (isTrackpad === false) {
    // MOUSE WHEEL: Zoom behavior
    const rect = canvasContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.98 : 1.02;
    const newScale = Math.max(0.1, Math.min(3, canvasTransform.scale * zoomFactor));
    
    // Zoom towards mouse position
    const scaleRatio = newScale / canvasTransform.scale;
    canvasTransform.x = mouseX - (mouseX - canvasTransform.x) * scaleRatio;
    canvasTransform.y = mouseY - (mouseY - canvasTransform.y) * scaleRatio;
    canvasTransform.scale = newScale;
    
    updateCanvasTransform();
  }
});

// Pan with mouse drag on canvas background
canvasContainer?.addEventListener('mousedown', (e) => {
  if (e.target === canvasContainer || e.target.id === 'mainCanvas') {
    isPanning = true;
    panStart = { x: e.clientX - canvasTransform.x, y: e.clientY - canvasTransform.y };
    canvasContainer.style.cursor = 'grabbing';
    e.preventDefault();
  }
});

document.addEventListener('mousemove', (e) => {
  if (isPanning) {
    canvasTransform.x = e.clientX - panStart.x;
    canvasTransform.y = e.clientY - panStart.y;
    updateCanvasTransform();
  }
});

document.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false;
    if (canvasContainer) canvasContainer.style.cursor = 'grab';
  }
});

// Touch support for mobile zoom/pan
canvasContainer?.addEventListener('touchstart', (e) => {
  e.preventDefault();
  // Handle touch pan/zoom - basic implementation
});

canvasContainer?.addEventListener('touchmove', (e) => {
  e.preventDefault();
  // Handle touch gestures
});

canvasContainer?.addEventListener('touchend', (e) => {
  e.preventDefault();
});

// Arrangement functionality
el('#btnArrangeEntities')?.addEventListener('click', () => {
  showArrangementDialog();
});

el('#btnFitToContent')?.addEventListener('click', () => {
  fitCanvasToContent();
});

function showArrangementDialog() {
  const view = getCurrentCanvasView();
  const entityCount = Object.keys(view.entities).length;
  
  if (entityCount === 0) {
    alert('No entities to arrange on this canvas!');
    return;
  }
  
  const arrangeBy = prompt(`⚠️ WARNING: This will overwrite all custom positions!\n\nCurrent entities: ${entityCount}\n\nArrange by:\n1. project\n2. status\n3. priority\n4. grid\n\nEnter option (1-4) or cancel:`);
  
  if (!arrangeBy) return;
  
  const confirmationText = `ARRANGE ${entityCount} ENTITIES`;
  const userConfirmation = prompt(`🚨 FINAL CONFIRMATION 🚨\n\nThis will PERMANENTLY OVERWRITE all ${entityCount} custom positions you've carefully placed.\n\nType exactly: "${confirmationText}" to confirm:`);
  
  if (userConfirmation !== confirmationText) {
    alert('Arrangement canceled - positions preserved.');
    return;
  }
  
  switch(arrangeBy) {
    case '1': arrangeByProject(); break;
    case '2': arrangeByStatus(); break;
    case '3': arrangeByPriority(); break;
    case '4': arrangeInGrid(); break;
    default: alert('Invalid option - arrangement canceled.');
  }
}

function arrangeByProject() {
  const view = getCurrentCanvasView();
  const groups = {};
  
  // Group entities
  Object.entries(view.entities).forEach(([key, pos]) => {
    const [type, id] = key.split(':');
    let projectId = 'no-project';
    
    if (type === 'todo' && store.todos[id]) {
      projectId = store.todos[id].projectId || 'no-project';
    } else if (type === 'project') {
      projectId = id;
    }
    
    if (!groups[projectId]) groups[projectId] = [];
    groups[projectId].push(key);
  });
  
  // Position groups
  let groupX = 50;
  Object.entries(groups).forEach(([projectId, keys]) => {
    let entityY = 50;
    
    keys.forEach(key => {
      view.entities[key] = { x: groupX, y: entityY };
      entityY += 120;
    });
    
    groupX += 300;
  });
  
  save();
  renderCanvas();
  alert('Arranged by project! 📁');
}

function arrangeByStatus() {
  const view = getCurrentCanvasView();
  const statusOrder = ['todo', 'in-progress', 'waiting', 'review', 'done'];
  const groups = {};
  
  // Group by status
  Object.entries(view.entities).forEach(([key, pos]) => {
    const [type, id] = key.split(':');
    let status = 'unknown';
    
    if (type === 'todo' && store.todos[id]) {
      status = store.todos[id].status || 'todo';
    } else if (type === 'project') {
      status = 'project';
    }
    
    if (!groups[status]) groups[status] = [];
    groups[status].push(key);
  });
  
  // Position by status columns
  let columnX = 50;
  statusOrder.concat(['project', 'unknown']).forEach(status => {
    if (groups[status]) {
      let entityY = 50;
      groups[status].forEach(key => {
        view.entities[key] = { x: columnX, y: entityY };
        entityY += 100;
      });
      columnX += 250;
    }
  });
  
  save();
  renderCanvas();
  alert('Arranged by status! 📊');
}

function arrangeByPriority() {
  const view = getCurrentCanvasView();
  const entities = Object.entries(view.entities);
  
  // Sort by priority (HIU score)
  entities.sort(([keyA], [keyB]) => {
    const [typeA, idA] = keyA.split(':');
    const [typeB, idB] = keyB.split(':');
    
    const getScore = (type, id) => {
      if (type === 'todo' && store.todos[id]) {
        const e = store.todos[id].eisen || {};
        return (e.impact || 0) + (e.important || 0) + (e.urgent || 0);
      }
      return type === 'project' ? 5 : 0; // Projects at top
    };
    
    return getScore(typeB, idB) - getScore(typeA, idA);
  });
  
  // Arrange in priority order (top to bottom, left to right)
  let x = 50, y = 50;
  const maxWidth = 900;
  
  entities.forEach(([key], index) => {
    view.entities[key] = { x, y };
    
    x += 200;
    if (x > maxWidth) {
      x = 50;
      y += 120;
    }
  });
  
  save();
  renderCanvas();
  alert('Arranged by priority! ⭐');
}

function arrangeInGrid() {
  const view = getCurrentCanvasView();
  const entities = Object.keys(view.entities);
  const cols = Math.ceil(Math.sqrt(entities.length));
  
  let row = 0, col = 0;
  entities.forEach(key => {
    view.entities[key] = {
      x: 80 + col * 180,
      y: 80 + row * 140
    };
    
    col++;
    if (col >= cols) {
      col = 0;
      row++;
    }
  });
  
  save();
  renderCanvas();
  alert('Arranged in grid! 📋');
}

/*** ====== INIT & RENDER ====== ***/
function render(full = false) {
  commitActiveInlineEdits();
  const currentTab = store.current.tab;
  els('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === currentTab));
  views.forEach(id => el('#view-' + id).classList.toggle('hidden', currentTab !== id));

  if (full) {
    restoreViewState();
    restoreGlobalFilters();
  }
  
  // ALWAYS compute view data first - this is the single source of truth
  updateGlobalFilters(); // Update filter dropdowns
  computeViewData();     // Compute filtered data for all views

  switch (currentTab) {
    case 'todos':
      renderMainTodos();
      break;
    case 'projects':
      renderProjects();
      break;
    case 'people':
      renderPeople();
      break;
    case 'kanban':
      renderKanban();
      break;
    case 'canvas':
      renderCanvas();
      break;
    case 'ai':
      renderAi();
      break;
  }
}

// Detect changes from other tabs or windows
window.addEventListener('storage', (e) => {
  if (e.key === LS_KEY && e.newValue) {
    try {
      const newData = JSON.parse(e.newValue);
      const oldSaveCount = store._saveCount || 0;
      const newSaveCount = newData._saveCount || 0;
      
      console.warn('⚠️ Data changed in another tab!');
      console.log('Old save count:', oldSaveCount, 'New save count:', newSaveCount);
      console.log('Old last saved:', store._lastSaved || 'unknown');
      console.log('New last saved:', newData._lastSaved || 'unknown');
      
      if (confirm('⚠️ Data was changed in another tab/window.\n\nYour version: Save #' + oldSaveCount + ' at ' + (store._lastSaved || 'unknown') + '\nOther version: Save #' + newSaveCount + ' at ' + (newData._lastSaved || 'unknown') + '\n\nReload to see the latest changes?\n\n(Click Cancel to keep working with your current version)')) {
        store = newData;
        render(true);
        alert('✅ Reloaded with latest data from other tab');
      } else {
        alert('⚠️ You kept your version. Be careful - saving now will overwrite the other tab\'s changes!');
      }
    } catch (err) {
      console.error('Error handling storage event:', err);
    }
  }
});

/*** ====== AI CHAT ====== ***/
const AI_LS_KEY = 'jwdm_ai_settings';
const aiMessages = el('#aiMessages');
const aiPrompt = el('#aiPrompt');
const btnAiSend = el('#btnAiSend');
const btnAiSettings = el('#btnAiSettings');
const dlgAiSettings = el('#dlgAiSettings');
const aiDataSizeText = el('#aiDataSizeText');

// Load AI settings
function loadAiSettings() {
  try {
    const raw = localStorage.getItem(AI_LS_KEY);
    return raw ? JSON.parse(raw) : { apiKey: '', model: 'gpt-4o-mini' };
  } catch { return { apiKey: '', model: 'gpt-4o-mini' }; }
}

function saveAiSettings(settings) {
  localStorage.setItem(AI_LS_KEY, JSON.stringify(settings));
}

// Build context data for AI
function buildAiContext() {
  const today = new Date().toISOString().slice(0, 10);
  const context = {
    metadata: { today, todoCount: Object.keys(store.todos).length, projectCount: Object.keys(store.projects).length, peopleCount: Object.keys(store.people).length },
    todos: Object.values(store.todos).map(t => ({
      title: t.title,
      status: t.status,
      project: store.projects[t.projectId]?.name || null,
      due: t.due || null,
      people: (t.people || []).map(pid => store.people[pid]?.name).filter(Boolean),
      notes: t.notes || null,
      tags: t.tags || []
    })),
    projects: Object.values(store.projects).map(p => ({
      name: p.name,
      todoCount: (p.todoIds || []).length
    })),
    people: Object.values(store.people).map(p => ({
      name: p.name,
      waitingForMe: (p.waitingForMe || []).map(tid => store.todos[tid]?.title).filter(Boolean),
      waitingForThem: (p.waitingForThem || []).map(tid => store.todos[tid]?.title).filter(Boolean),
      projects: (p.projects || []).map(pid => store.projects[pid]?.name).filter(Boolean)
    }))
  };
  return context;
}

// Calculate and display data size
function updateAiDataSize() {
  const context = buildAiContext();
  const json = JSON.stringify(context);
  const bytes = new Blob([json]).size;
  const kb = (bytes / 1024).toFixed(1);
  const tokens = Math.ceil(json.length / 4); // rough estimate: ~4 chars per token
  aiDataSizeText.textContent = `~${kb} KB / ~${tokens} tokens`;
}

// Chat history for conversation context
let chatHistory = [];

// System prompt
const SYSTEM_PROMPT = `You are a helpful project manager AI assistant. You have access to the user's todos, projects, and team members data. Help them prioritize, summarize, analyze workload, and provide actionable insights.

Be concise but helpful. Use bullet points for lists. When referring to specific items, mention them by name. Provide practical advice.

Today's date is ${new Date().toLocaleDateString()}.`;

// Send message to OpenAI
async function sendToAi(userMessage) {
  const settings = loadAiSettings();
  if (!settings.apiKey) {
    dlgAiSettings.showModal();
    return { error: 'Please configure your OpenAI API key first.' };
  }
  
  const context = buildAiContext();
  const contextMessage = `Here is the current state of the user's work data:\n\n${JSON.stringify(context, null, 2)}`;
  
  // Build messages array
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: contextMessage },
    ...chatHistory,
    { role: 'user', content: userMessage }
  ];
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response received.';
    
    // Add to history
    chatHistory.push({ role: 'user', content: userMessage });
    chatHistory.push({ role: 'assistant', content: reply });
    
    // Keep history manageable (last 10 exchanges)
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
    
    return { content: reply };
  } catch (error) {
    return { error: error.message };
  }
}

// Render message bubble
let messageCounter = 0;

function renderMessage(role, content, isError = false) {
  const msgId = `ai-msg-${++messageCounter}`;
  const div = document.createElement('div');
  div.className = `ai-message ${role}`;
  div.id = msgId;
  
  const avatar = document.createElement('div');
  avatar.className = 'ai-message-avatar';
  avatar.innerHTML = role === 'assistant' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'ai-message-content';
  
  const bubble = document.createElement('div');
  bubble.className = 'ai-message-bubble';
  
  // Add delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'ai-message-delete';
  deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
  deleteBtn.title = 'Delete message';
  deleteBtn.onclick = () => {
    div.remove();
    // Also remove from history if it exists
    const idx = chatHistory.findIndex(m => m._id === msgId);
    if (idx !== -1) chatHistory.splice(idx, 1);
  };
  
  if (isError) {
    bubble.innerHTML = `<div class="ai-error"><i class="fas fa-exclamation-triangle"></i> ${content}</div>`;
  } else {
    // Simple markdown-like formatting
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n- /g, '</p><ul><li>')
      .replace(/\n(\d+)\. /g, '</p><ol><li>');
    
    // Clean up list formatting
    if (html.includes('<ul>')) {
      html = html.replace(/<\/p><ul>/g, '<ul>').replace(/<li>([^<]*?)(?=<li>|$)/g, '<li>$1</li>');
      if (!html.includes('</ul>')) html += '</ul>';
    }
    
    bubble.innerHTML = `<p>${html}</p>`;
  }
  
  contentDiv.appendChild(bubble);
  contentDiv.appendChild(deleteBtn);
  div.appendChild(avatar);
  div.appendChild(contentDiv);
  
  // Remove welcome message if present
  const welcome = aiMessages.querySelector('.ai-welcome');
  if (welcome) welcome.remove();
  
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

// Show loading indicator
function showLoading() {
  const div = document.createElement('div');
  div.className = 'ai-message assistant';
  div.id = 'ai-loading';
  div.innerHTML = `
    <div class="ai-message-avatar"><i class="fas fa-robot"></i></div>
    <div class="ai-message-content">
      <div class="ai-loading"><span></span><span></span><span></span></div>
    </div>
  `;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}

function hideLoading() {
  el('#ai-loading')?.remove();
}

// Handle send
async function handleAiSend() {
  const message = aiPrompt.value.trim();
  if (!message) return;
  
  aiPrompt.value = '';
  aiPrompt.style.height = 'auto';
  btnAiSend.disabled = true;
  
  renderMessage('user', message);
  showLoading();
  
  const result = await sendToAi(message);
  
  hideLoading();
  btnAiSend.disabled = false;
  
  if (result.error) {
    renderMessage('assistant', result.error, true);
  } else {
    renderMessage('assistant', result.content);
  }
  
  aiPrompt.focus();
}

// Event listeners
btnAiSend?.addEventListener('click', handleAiSend);

aiPrompt?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAiSend();
  }
});

aiPrompt?.addEventListener('input', () => {
  aiPrompt.style.height = 'auto';
  aiPrompt.style.height = Math.min(aiPrompt.scrollHeight, 120) + 'px';
});

btnAiSettings?.addEventListener('click', () => {
  const settings = loadAiSettings();
  el('#aiApiKey').value = settings.apiKey || '';
  el('#aiModel').value = settings.model || 'gpt-4o-mini';
  dlgAiSettings.showModal();
});

dlgAiSettings?.addEventListener('close', () => {
  if (dlgAiSettings.returnValue === 'default') {
    const settings = {
      apiKey: el('#aiApiKey').value.trim(),
      model: el('#aiModel').value
    };
    saveAiSettings(settings);
  }
});

// Clear entire chat
el('#btnAiClearChat')?.addEventListener('click', () => {
  if (confirm('Clear entire chat history?')) {
    chatHistory = [];
    messageCounter = 0;
    aiMessages.innerHTML = `<div class="ai-welcome">
      <div class="ai-welcome-icon"><i class="fas fa-wand-magic-sparkles"></i></div>
      <h3>AI Project Assistant</h3>
      <p>Ask me about your todos, projects, or people. I can help you prioritize, summarize, or analyze your work.</p>
      <div class="ai-suggestions">
        <button class="ai-suggestion" data-prompt="What are my most urgent tasks?">Most urgent tasks</button>
        <button class="ai-suggestion" data-prompt="Summarize my projects and their status">Project summary</button>
        <button class="ai-suggestion" data-prompt="Who has the most work on their plate?">Workload analysis</button>
        <button class="ai-suggestion" data-prompt="What tasks are overdue or due soon?">Overdue tasks</button>
      </div>
    </div>`;
    // Re-attach suggestion button listeners
    els('.ai-suggestion')?.forEach(btn => {
      btn.addEventListener('click', () => {
        aiPrompt.value = btn.dataset.prompt;
        handleAiSend();
      });
    });
  }
});

// Suggestion buttons
els('.ai-suggestion')?.forEach(btn => {
  btn.addEventListener('click', () => {
    aiPrompt.value = btn.dataset.prompt;
    handleAiSend();
  });
});

// Update data size when switching to AI tab
function renderAi() {
  updateAiDataSize();
}

render(true);
