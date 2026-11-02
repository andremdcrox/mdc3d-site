const TAG_LABEL = {
  colecionavel: "Colecionável",
  funcional: "Funcional",
  chaveiro: "Chaveiro",
  decoracao: "Decoração",
};

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderProdutos(filtro = 'todos') {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  const lista = filtro === 'todos' ? PRODUTOS : PRODUTOS.filter(p => p.categoria === filtro);

  grid.innerHTML = lista.map(p => `
    <div class="product-card">
      <div class="product-thumb">${p.icon}</div>
      <div class="product-body">
        <span class="product-tag">${TAG_LABEL[p.categoria] || p.categoria}</span>
        <h3>${p.nome}</h3>
        <div class="product-price">${brl(p.preco)}<small>arquivo STL</small></div>
        <button class="btn btn-primary btn-sm btn-block" onclick="comprar(${p.id})">Comprar</button>
      </div>
    </div>
  `).join('');
}

function comprar(id) {
  const p = PRODUTOS.find(x => x.id === id);
  toast(`Pagamento ainda não conectado — em breve você poderá comprar "${p.nome}" via Pix/Cartão.`);
}

document.addEventListener('DOMContentLoaded', () => {
  renderProdutos();
  document.querySelectorAll('#filters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#filters .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderProdutos(chip.dataset.filter);
    });
  });
});
