// ════════════════════════════════════════════════════
//  CONEXÃO COM O BANCO DE DADOS (SUPABASE)
// ════════════════════════════════════════════════════
const supabaseUrl = 'https://rzcqmrhwazeruwlssnvf.supabase.co';
const supabaseKey = 'COLE_SUA_CHAVE_PUBLISHABLE_AQUIsb_publishable_kBt893nBZFwij-VzHB5zAg_8d2pcEdR';
const db = supabase.createClient(supabaseUrl, supabaseKey);

// ════════════════════════════════════════════════════
//  ESTADO
// ════════════════════════════════════════════════════
let tasks = [];
let routineTasks = [];
let filter = 'pending';
let isRoutineMode = false;
let routineOpen = true;

// ════════════════════════════════════════════════════
//  INICIALIZAÇÃO E BUSCA DOS DADOS
// ════════════════════════════════════════════════════
async function loadAll() {
  // Busca tudo no banco de dados
  const { data, error } = await db.from('tarefas').select('*');

  if (error) {
    console.error("Erro ao buscar dados:", error);
    return;
  }

  // Separa o que veio do banco para as nossas listas locais
  tasks = data
    .filter(t => t.tipo === 'avulsa')
    .map(t => ({ id: t.id, text: t.texto, done: t.concluida }));

  routineTasks = data
    .filter(t => t.tipo === 'rotina')
    .map(t => ({ id: t.id, text: t.texto, done: t.concluida }));

  // Lógica para desmarcar a rotina se o dia mudou (usando localStorage só pra data)
  const lastDate = localStorage.getItem('routine_last_date');
  const today = new Date().toISOString().slice(0, 10);

  if (lastDate !== today && routineTasks.length > 0) {
    routineTasks.forEach(t => t.done = false);
    localStorage.setItem('routine_last_date', today);
    // Atualiza todas as rotinas para não concluídas no banco
    await db.from('tarefas').update({ concluida: false }).eq('tipo', 'rotina');
  }

  render();
  renderRoutine();
}

// ════════════════════════════════════════════════════
//  TAREFAS AVULSAS
// ════════════════════════════════════════════════════
async function addTask(text) {
  text = text.trim();
  if (!text) return;

  // Salva no banco primeiro
  const { data, error } = await db.from('tarefas')
    .insert([{ texto: text, concluida: false, tipo: 'avulsa' }])
    .select();

  if (!error && data) {
    // Adiciona na tela usando o ID que o banco gerou
    tasks.push({ id: data[0].id, text: data[0].texto, done: data[0].concluida });
    render();
  }
}

async function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) {
    t.done = !t.done;
    render(); // Atualiza a tela rápido
    // Atualiza no banco em segundo plano
    await db.from('tarefas').update({ concluida: t.done }).eq('id', id);
  }
}

async function deleteTask(id, liEl) {
  liEl.classList.add('removing');
  liEl.addEventListener('transitionend', async () => {
    tasks = tasks.filter(t => t.id !== id);
    render();
    // Deleta do banco
    await db.from('tarefas').delete().eq('id', id);
  }, { once: true });
}

async function clearDone() {
  const doneTasks = tasks.filter(t => t.done);
  tasks = tasks.filter(t => !t.done);
  render();

  // Deleta todas as concluídas do banco
  for (let t of doneTasks) {
    await db.from('tarefas').delete().eq('id', t.id);
  }
}

function render() {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');

  const visible = tasks.filter(t => {
    if (filter === 'done') return t.done;
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
async function addRoutineTask(text) {
  text = text.trim();
  if (!text) return;

  const { data, error } = await db.from('tarefas')
    .insert([{ texto: text, concluida: false, tipo: 'rotina' }])
    .select();

  if (!error && data) {
    routineTasks.push({ id: data[0].id, text: data[0].texto, done: data[0].concluida });
    renderRoutine();
  }
}

async function toggleRoutineTask(id) {
  const t = routineTasks.find(t => t.id === id);
  if (t) {
    t.done = !t.done;
    renderRoutine();
    await db.from('tarefas').update({ concluida: t.done }).eq('id', id);
  }
}

async function deleteRoutineTask(id, liEl) {
  liEl.classList.add('removing');
  liEl.addEventListener('transitionend', async () => {
    routineTasks = routineTasks.filter(t => t.id !== id);
    renderRoutine();
    await db.from('tarefas').delete().eq('id', id);
  }, { once: true });
}

function renderRoutine() {
  const list = document.getElementById('routine-list');
  const empty = document.getElementById('routine-empty');

  const hoje = new Date();
  document.getElementById('routine-date').textContent =
    hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const total = routineTasks.length;
  const done = routineTasks.filter(t => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById('progress-bar-fill').style.width = pct + '%';
  document.getElementById('routine-progress').textContent = done + '/' + total;

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
  const total = tasks.length + routineTasks.length;
  const done = tasks.filter(t => t.done).length + routineTasks.filter(t => t.done).length;
  const pending = total - done;
  document.getElementById('count-total').textContent = total;
  document.getElementById('count-done').textContent = done;
  document.getElementById('count-pending').textContent = pending;
}

// ════════════════════════════════════════════════════
//  TOGGLE ROTINA E EVENTOS
// ════════════════════════════════════════════════════
document.getElementById('toggle-label').addEventListener('click', () => {
  isRoutineMode = !isRoutineMode;
  const box = document.getElementById('toggle-box');
  const hint = document.getElementById('routine-hint');
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

document.getElementById('add-btn').addEventListener('click', () => {
  const inp = document.getElementById('task-input');
  const text = inp.value;
  if (isRoutineMode) addRoutineTask(text);
  else addTask(text);
  inp.value = '';
  inp.focus();
});

document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const text = e.target.value;
  if (isRoutineMode) addRoutineTask(text);
  else addTask(text);
  e.target.value = '';
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

document.getElementById('clear-done').addEventListener('click', clearDone);

document.getElementById('routine-toggle').addEventListener('click', () => {
  routineOpen = !routineOpen;
  document.getElementById('routine-body').classList.toggle('collapsed', !routineOpen);
  document.getElementById('routine-chevron').classList.toggle('collapsed', !routineOpen);
});

// ════════════════════════════════════════════════════
//  INICIA O APLICATIVO LENDO DO BANCO
// ════════════════════════════════════════════════════
loadAll();