// app.js  (ES module → <script type="module" src="app.js"> in index.html)
const taskForm   = document.getElementById('taskForm');
const taskInput  = document.getElementById('taskInput');
const queueList  = document.getElementById('queueList');
const popBtn     = document.getElementById('popBtn');
const currentDiv = document.getElementById('currentTask');

/* -------------- domain model -------------- */
let queue = [];          // {id, desc, priority}

/* utility: regenerate <li> list */
function renderQueue() {
  queueList.innerHTML = '';                       // clear
  queue.forEach(t => {
    const li = document.createElement('li');
    li.textContent = `${t.desc}  •  (${t.priority})`;
    queueList.appendChild(li);
  });
}

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
});

/* pop: button click */
popBtn.addEventListener('click', () => {
  if (!queue.length) return;
  const next = queue.shift();                     // remove first
  currentDiv.textContent = `▶ Now doing: ${next.desc}`;
  renderQueue();
});

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