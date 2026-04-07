// ════════════════════════════════════════════════════
//  CHAVES DE ARMAZENAMENTO
// ════════════════════════════════════════════════════
const TASK_KEY    = 'tasks_v1';
const ROUTINE_KEY = 'routine_tasks_v1';
const DATE_KEY    = 'routine_last_date';

// ════════════════════════════════════════════════════
//  ESTADO
// ════════════════════════════════════════════════════
let tasks        = [];
let routineTasks = [];
let filter       = 'all';
let isRoutineMode = false;
let routineOpen  = true;

// ════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════
function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// ════════════════════════════════════════════════════
//  PERSISTÊNCIA (localStorage)
// ════════════════════════════════════════════════════
function saveTasks() {
  localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
}

function saveRoutine() {
  localStorage.setItem(ROUTINE_KEY, JSON.stringify(routineTasks));
}

function loadAll() {
  // Tarefas avulsas
  try { tasks = JSON.parse(localStorage.getItem(TASK_KEY)) || []; }
  catch { tasks = []; }

  // Rotina
  try { routineTasks = JSON.parse(localStorage.getItem(ROUTINE_KEY)) || []; }
  catch { routineTasks = []; }

  // Reseta "done" da rotina se o dia mudou
  const lastDate = localStorage.getItem(DATE_KEY);
  const today    = todayString();
  if (lastDate !== today) {
    routineTasks.forEach(t => t.done = false);
    localStorage.setItem(DATE_KEY, today);
    saveRoutine();
  }

  render();
  renderRoutine();
}

// ════════════════════════════════════════════════════
//  TAREFAS AVULSAS
// ════════════════════════════════════════════════════
function addTask(text) {
  text = text.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, done: false });
  saveTasks();
  render();
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; saveTasks(); render(); }
}

function deleteTask(id, liEl) {
  liEl.classList.add('removing');
  liEl.addEventListener('transitionend', () => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }, { once: true });
}

function clearDone() {
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  render();
}

function render() {
  const list  = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');

  const visible = tasks.filter(t => {
    if (filter === 'done')    return t.done;
    if (filter === 'pending') return !t.done;
    return true;
  });

  list.innerHTML = '';

  if (visible.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    visible.forEach(t => {
      const li = document.createElement('li');
      li.className = 'task-item' + (t.done ? ' done' : '');

      const chk = document.createElement('button');
      chk.className = 'check-btn';
      chk.textContent = t.done ? '✓' : '';
      chk.addEventListener('click', () => toggleTask(t.id));

      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = t.text;

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.innerHTML = '&#10005;';
      del.addEventListener('click', () => deleteTask(t.id, li));

      li.append(chk, span, del);
      list.appendChild(li);
    });
  }

  updateStats();
}

// ════════════════════════════════════════════════════
//  ROTINA DIÁRIA
// ════════════════════════════════════════════════════
function addRoutineTask(text) {
  text = text.trim();
  if (!text) return;
  routineTasks.push({ id: Date.now(), text, done: false });
  saveRoutine();
  renderRoutine();
}

function toggleRoutineTask(id) {
  const t = routineTasks.find(t => t.id === id);
  if (t) { t.done = !t.done; saveRoutine(); renderRoutine(); }
}

function deleteRoutineTask(id, liEl) {
  liEl.classList.add('removing');
  liEl.addEventListener('transitionend', () => {
    routineTasks = routineTasks.filter(t => t.id !== id);
    saveRoutine();
    renderRoutine();
  }, { once: true });
}

function renderRoutine() {
  const list  = document.getElementById('routine-list');
  const empty = document.getElementById('routine-empty');

  // Data formatada
  const hoje = new Date();
  document.getElementById('routine-date').textContent =
    hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Barra de progresso
  const total = routineTasks.length;
  const done  = routineTasks.filter(t => t.done).length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById('progress-bar-fill').style.width = pct + '%';
  document.getElementById('routine-progress').textContent  = done + '/' + total;

  // Lista
  list.innerHTML = '';

  if (routineTasks.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    routineTasks.forEach(t => {
      const li = document.createElement('li');
      li.className = 'routine-item' + (t.done ? ' done' : '');

      const chk = document.createElement('button');
      chk.className = 'check-btn';
      chk.textContent = t.done ? '✓' : '';
      chk.addEventListener('click', () => toggleRoutineTask(t.id));

      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = t.text;

      const del = document.createElement('button');
      del.className = 'del-btn';
      del.innerHTML = '&#10005;';
      del.addEventListener('click', () => deleteRoutineTask(t.id, li));

      li.append(chk, span, del);
      list.appendChild(li);
    });
  }

  updateStats();
}

// ════════════════════════════════════════════════════
//  STATS GERAIS
// ════════════════════════════════════════════════════
function updateStats() {
  const total   = tasks.length + routineTasks.length;
  const done    = tasks.filter(t => t.done).length + routineTasks.filter(t => t.done).length;
  const pending = total - done;
  document.getElementById('count-total').textContent   = total;
  document.getElementById('count-done').textContent    = done;
  document.getElementById('count-pending').textContent = pending;
}

// ════════════════════════════════════════════════════
//  TOGGLE ROTINA (caixinha)
// ════════════════════════════════════════════════════
document.getElementById('toggle-label').addEventListener('click', () => {
  isRoutineMode = !isRoutineMode;

  const box   = document.getElementById('toggle-box');
  const hint  = document.getElementById('routine-hint');
  const input = document.getElementById('task-input');

  box.classList.toggle('active', isRoutineMode);
  hint.classList.toggle('visible', isRoutineMode);

  if (isRoutineMode) {
    input.placeholder = 'Adicionar à rotina diária…';
    input.classList.add('routine-mode');
  } else {
    input.placeholder = 'Adicionar nova tarefa…';
    input.classList.remove('routine-mode');
  }
});

// ════════════════════════════════════════════════════
//  EVENTOS — INPUT ÚNICO
// ════════════════════════════════════════════════════
document.getElementById('add-btn').addEventListener('click', () => {
  const inp = document.getElementById('task-input');
  const text = inp.value;

  if (isRoutineMode) {
    addRoutineTask(text);
  } else {
    addTask(text);
  }

  inp.value = '';
  inp.focus();
});

document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const text = e.target.value;
  if (isRoutineMode) {
    addRoutineTask(text);
  } else {
    addTask(text);
  }
  e.target.value = '';
});

// ════════════════════════════════════════════════════
//  FILTROS
// ════════════════════════════════════════════════════
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

document.getElementById('clear-done').addEventListener('click', clearDone);

// ════════════════════════════════════════════════════
//  ACCORDION ROTINA
// ════════════════════════════════════════════════════
document.getElementById('routine-toggle').addEventListener('click', () => {
  routineOpen = !routineOpen;
  document.getElementById('routine-body').classList.toggle('collapsed', !routineOpen);
  document.getElementById('routine-chevron').classList.toggle('collapsed', !routineOpen);
});

// ════════════════════════════════════════════════════
//  INICIALIZAÇÃO
// ════════════════════════════════════════════════════
loadAll();