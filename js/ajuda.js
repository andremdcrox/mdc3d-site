const CAT_LABEL = {
  adesao: "Adesão",
  extrusao: "Extrusão",
  mecanico: "Mecânico",
  temperatura: "Temperatura",
  acabamento: "Acabamento",
};

function renderProblemas(filtro = "todos") {
  const list = document.getElementById("problem-list");
  if (!list) return;
  const itens = filtro === "todos" ? PROBLEMAS : PROBLEMAS.filter(p => p.categoria === filtro);

  list.innerHTML = itens.map(p => `
    <details class="problem-item">
      <summary>
        <span class="p-icon">${p.icon}</span>
        <span>${p.titulo}</span>
        <span class="problem-cat-badge">${CAT_LABEL[p.categoria]}</span>
        <span class="arrow">▾</span>
      </summary>
      <div class="problem-body">
        <strong>Causa comum</strong>
        <p>${p.causa}</p>
        <strong>Como resolver</strong>
        <p>${p.solucao}</p>
      </div>
    </details>
  `).join("");
}

function renderMarcas() {
  const grid = document.getElementById("brand-grid");
  if (!grid) return;
  grid.innerHTML = MARCAS.map(m => `
    <div class="brand-card">
      <div class="brand-icon">${m.icon}</div>
      <h3>${m.nome}</h3>
      <p>${m.nota}</p>
      <a href="${m.url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Ver códigos oficiais →</a>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderProblemas();
  renderMarcas();

  document.querySelectorAll("#problem-filters .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#problem-filters .chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      renderProblemas(chip.dataset.filter);
      if (typeof initReveal === "function") initReveal();
    });
  });
});
