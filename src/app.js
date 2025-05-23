// app.js  (ES module → <script type="module" src="app.js"> in index.html)
const taskForm   = document.getElementById('taskForm');
const taskInput  = document.getElementById('taskInput');
const queueList  = document.getElementById('queueList');
const popBtn     = document.getElementById('popBtn');
const currentDiv = document.getElementById('currentTask');
const fileInput  = document.getElementById('fileInput');
const exportBtn  = document.getElementById('exportBtn');

/* -------------- domain model -------------- */
let queue = [];          // {id, desc, priority}
let popCount = 0;        // Track number of popped tasks

/* utility: regenerate <li> list */
function renderQueue() {
  queueList.innerHTML = '';                       // clear
  queue.forEach(t => {
    const li = document.createElement('li');
    li.textContent = `${t.desc}  •  (${t.priority})`;
    queueList.appendChild(li);
  });
}

/* utility: save to localStorage */
function saveToLocalStorage() {
  localStorage.setItem('taskQueue', JSON.stringify({
    queue,
    popCount
  }));
}

/* utility: auto-export after every 5 pops */
function autoExport() {
  const state = {
    version: 1,
    tasks: queue.map(t => ({
      id: t.id,
      desc: t.desc
    }))
  };
  
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks-auto-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -------------- export/import state -------------- */
exportBtn.addEventListener('click', () => {
  const state = {
    version: 1,
    tasks: queue.map(t => ({
      id: t.id,
      desc: t.desc
    }))
  };
  
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

fileInput.addEventListener('change', evt => {
  const file = evt.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    
    // Try parsing as JSON first (for state import)
    try {
      const state = JSON.parse(text);
      if (state.version === 1 && Array.isArray(state.tasks)) {
        // Import state
        queue = state.tasks.map(t => ({
          ...t,
          priority: t.desc.length  // recalculate priorities
        }));
        queue.sort((a, b) => b.priority - a.priority);
        renderQueue();
        saveToLocalStorage();
        fileInput.value = '';
        return;
      }
    } catch (e) {
      // Not JSON, continue with text file processing
    }

    // Process as text file
    const lines = text.split(/\r?\n/);
    lines.forEach(line => {
      const desc = line.trim();
      if (!desc) return;  // skip empty lines
      
      // de-dupe on description text (optional)
      if (queue.some(t => t.desc === desc)) return;

      queue.push({
        id: crypto.randomUUID(),
        desc,
        priority: desc.length           // same naive rule
      });
    });

    queue.sort((a, b) => b.priority - a.priority);
    renderQueue();
    saveToLocalStorage();
    fileInput.value = '';                // reset so same file can be re-chosen
  };

  reader.readAsText(file);
});

/* push: form submit */
taskForm.addEventListener('submit', e => {
  e.preventDefault();
  const desc = taskInput.value.trim();
  if (!desc) return;
  queue.push({
    id: crypto.randomUUID(),
    desc,
    priority: desc.length          // naive rule
  });
  // sort high → low
  queue.sort((a, b) => b.priority - a.priority);
  taskInput.value = '';
  renderQueue();
  saveToLocalStorage();
});

/* pop: button click */
popBtn.addEventListener('click', () => {
  if (!queue.length) return;
  const next = queue.shift();                     // remove first
  currentDiv.textContent = `▶ Now doing: ${next.desc}`;
  renderQueue();
  
  // Increment pop count and check for auto-export
  popCount++;
  if (popCount % 5 === 0) {
    autoExport();
  }
  saveToLocalStorage();
});

/* Load from localStorage on startup */
const savedState = localStorage.getItem('taskQueue');
if (savedState) {
  try {
    const { queue: savedQueue, popCount: savedPopCount } = JSON.parse(savedState);
    queue = savedQueue;
    popCount = savedPopCount;
    renderQueue();
  } catch (e) {
    console.error('Failed to load saved state:', e);
  }
}

/* initial paint */
renderQueue();

/* keyboard shortcuts */
document.addEventListener('keydown', e => {
  // / to focus task input
  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    taskInput.focus();
  }
  
  // n to pop next task (only when not typing in input)
  if (e.key === 'n' && !e.ctrlKey && !e.metaKey && document.activeElement !== taskInput) {
    e.preventDefault();
    popBtn.click();
  }
}); 