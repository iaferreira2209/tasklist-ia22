// ════════════════════════════════════════════════════
//  CONEXÃO COM O BANCO DE DADOS (SUPABASE)
// ════════════════════════════════════════════════════
const supabaseUrl = 'https://rzcqmrhwazeruwlssnvf.supabase.co';
const supabaseKey = 'sb_publishable_kBt893nBZFwij-VzHB5zAg_8d2pcEdR';
const db = supabase.createClient(supabaseUrl, supabaseKey);

// ════════════════════════════════════════════════════
//  ESTADO
// ════════════════════════════════════════════════════
let gastos     = [];
let tipoAtual  = 'saida';
let pagtoAtual = 'dinheiro';
let filtro     = 'todos';

// ════════════════════════════════════════════════════
//  FORMATA VALOR PARA BRL
// ════════════════════════════════════════════════════
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

// ════════════════════════════════════════════════════
//  FORMATA DATA RELATIVA
// ════════════════════════════════════════════════════
function formatData(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ════════════════════════════════════════════════════
//  ÍCONE POR FORMA DE PAGAMENTO
// ════════════════════════════════════════════════════
const pagtoIcons = {
  dinheiro:     '💵 Dinheiro',
  pix:          '⚡ Pix',
  debito:       '💳 Débito',
  credito:      '🔄 Crédito',
  transferencia:'🏦 Transf.',
  outro:        '📎 Outro',
};

// ════════════════════════════════════════════════════
//  CARREGAR DADOS DO SUPABASE
// ════════════════════════════════════════════════════
async function loadGastos() {
  const { data, error } = await db
    .from('gastos')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao buscar gastos:', error);
    return;
  }

  gastos = data.map(g => ({
    id:      g.id,
    tipo:    g.tipo,
    valor:   g.valor,
    motivo:  g.motivo,
    pagto:   g.pagto,
    data:    g.criado_em,
  }));

  renderGastos();
}

// ════════════════════════════════════════════════════
//  ADICIONAR GASTO/ENTRADA
// ════════════════════════════════════════════════════
async function addGasto() {
  const valorRaw = parseFloat(document.getElementById('valor-input').value);
  const motivo   = document.getElementById('motivo-input').value.trim();

  if (!valorRaw || valorRaw <= 0) {
    pulseInput('valor-input');
    return;
  }
  if (!motivo) {
    pulseInput('motivo-input');
    return;
  }

  const payload = {
    tipo:   tipoAtual,
    valor:  valorRaw,
    motivo: motivo,
    pagto:  pagtoAtual,
  };

  const { data, error } = await db.from('gastos').insert([payload]).select();

  if (!error && data) {
    gastos.unshift({
      id:    data[0].id,
      tipo:  data[0].tipo,
      valor: data[0].valor,
      motivo:data[0].motivo,
      pagto: data[0].pagto,
      data:  data[0].criado_em,
    });

    // Limpa campos
    document.getElementById('valor-input').value  = '';
    document.getElementById('motivo-input').value = '';

    renderGastos();
  }
}

// ════════════════════════════════════════════════════
//  DELETAR GASTO
// ════════════════════════════════════════════════════
async function deleteGasto(id, liEl) {
  liEl.classList.add('removing');
  liEl.addEventListener('transitionend', async () => {
    gastos = gastos.filter(g => g.id !== id);
    renderGastos();
    await db.from('gastos').delete().eq('id', id);
  }, { once: true });
}

// ════════════════════════════════════════════════════
//  RENDERIZAR LISTA
// ════════════════════════════════════════════════════
function renderGastos() {
  const list  = document.getElementById('gastos-list');
  const empty = document.getElementById('empty-state');

  const visible = gastos.filter(g => {
    if (filtro === 'entrada') return g.tipo === 'entrada';
    if (filtro === 'saida')   return g.tipo === 'saida';
    return true;
  });

  list.innerHTML = '';

  if (visible.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    visible.forEach(g => {
      const li = document.createElement('li');
      li.className = `gasto-item ${g.tipo}`;

      // Ícone de tipo
      const iconeEl = document.createElement('div');
      iconeEl.className = 'gasto-tipo-icon';
      iconeEl.textContent = g.tipo === 'entrada' ? '↑' : '↓';

      // Conteúdo
      const content = document.createElement('div');
      content.className = 'gasto-content';

      const motivoEl = document.createElement('div');
      motivoEl.className = 'gasto-motivo';
      motivoEl.textContent = g.motivo;

      const metaEl = document.createElement('div');
      metaEl.className = 'gasto-meta';

      const pagtoEl = document.createElement('span');
      pagtoEl.className = 'gasto-pagto';
      pagtoEl.textContent = pagtoIcons[g.pagto] || g.pagto;

      const dataEl = document.createElement('span');
      dataEl.className = 'gasto-data';
      dataEl.textContent = formatData(g.data);

      metaEl.append(pagtoEl, dataEl);
      content.append(motivoEl, metaEl);

      // Valor
      const valorEl = document.createElement('span');
      valorEl.className = 'gasto-valor';
      valorEl.textContent = (g.tipo === 'saida' ? '− ' : '+ ') + formatBRL(g.valor);

      // Deletar
      const del = document.createElement('button');
      del.className = 'del-btn';
      del.innerHTML = '&#10005;';
      del.addEventListener('click', () => deleteGasto(g.id, li));

      li.append(iconeEl, content, valorEl, del);
      list.appendChild(li);
    });
  }

  // Atualiza total de registros
  document.getElementById('total-count').textContent =
    `${visible.length} ${visible.length === 1 ? 'registro' : 'registros'}`;

  updateSummary();
}

// ════════════════════════════════════════════════════
//  ATUALIZA RESUMO FINANCEIRO
// ════════════════════════════════════════════════════
function updateSummary() {
  const totalEntrada = gastos
    .filter(g => g.tipo === 'entrada')
    .reduce((acc, g) => acc + g.valor, 0);

  const totalSaida = gastos
    .filter(g => g.tipo === 'saida')
    .reduce((acc, g) => acc + g.valor, 0);

  const saldo = totalEntrada - totalSaida;

  document.getElementById('total-entrada').textContent = formatBRL(totalEntrada);
  document.getElementById('total-saida').textContent   = formatBRL(totalSaida);
  document.getElementById('saldo-total').textContent   = formatBRL(Math.abs(saldo));

  const balanceStat = document.getElementById('balance-stat');
  if (saldo < 0) {
    balanceStat.classList.add('negative');
  } else {
    balanceStat.classList.remove('negative');
  }
}

// ════════════════════════════════════════════════════
//  PULSO DE VALIDAÇÃO
// ════════════════════════════════════════════════════
function pulseInput(id) {
  const el = document.getElementById(id);
  el.style.borderColor = '#c84b31';
  el.style.boxShadow   = '0 0 0 3px #f5ddd8';
  el.focus();
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
  }, 1500);
}

// ════════════════════════════════════════════════════
//  EVENTOS
// ════════════════════════════════════════════════════

// Toggle Tipo (Entrada / Saída)
document.querySelectorAll('.tipo-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    tipoAtual = btn.dataset.tipo;
    document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Forma de pagamento
document.querySelectorAll('.pagto-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    pagtoAtual = btn.dataset.pagto;
    document.querySelectorAll('.pagto-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Adicionar
document.getElementById('add-gasto-btn').addEventListener('click', addGasto);

// Enter no campo motivo
document.getElementById('motivo-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addGasto();
});

// Filtros
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filtro = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGastos();
  });
});

// Limpar todos
document.getElementById('clear-all-btn').addEventListener('click', async () => {
  if (!confirm('Tem certeza que deseja apagar TODOS os lançamentos?')) return;
  const ids = gastos.map(g => g.id);
  gastos = [];
  renderGastos();
  for (const id of ids) {
    await db.from('gastos').delete().eq('id', id);
  }
});

// ════════════════════════════════════════════════════
//  INICIA O APP
// ════════════════════════════════════════════════════
loadGastos();
