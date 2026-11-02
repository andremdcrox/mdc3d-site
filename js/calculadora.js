function brlFmt(v) {
  if (!isFinite(v)) v = 0;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function num(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseFloat(el.value);
  return isFinite(v) && v >= 0 ? v : 0;
}

function getCustoTotal() {
  const peso = num('peso');                 // g
  const filamentoKg = num('filamento');      // R$/kg
  const perda = num('perda');                // %
  const tempo = num('tempo');                // horas
  const potencia = num('potencia');          // W
  const kwh = num('kwh');                    // R$/kWh
  const desgasteHora = num('desgaste');      // R$/h
  const tempoPos = num('tempoPos');          // horas
  const valorHora = num('valorHora');        // R$/h
  const embalagem = num('embalagem');        // R$

  const custoMaterial = (peso / 1000) * filamentoKg * (1 + perda / 100);
  const custoEnergia = tempo * (potencia / 1000) * kwh;
  const custoMaquina = tempo * desgasteHora;
  const custoMaoObra = tempoPos * valorHora;
  const custoEmbalagem = embalagem;

  return {
    custoMaterial, custoEnergia, custoMaquina, custoMaoObra, custoEmbalagem,
    total: custoMaterial + custoEnergia + custoMaquina + custoMaoObra + custoEmbalagem,
  };
}

function getDivisorTaxa() {
  const taxa = clamp(num('taxa'), 0, 90);
  return Math.max(0.05, 1 - taxa / 100); // nunca deixa dividir por ~0
}

function calcular() {
  const custos = getCustoTotal();
  const divisorTaxa = getDivisorTaxa();
  const margemFrac = num('margem') / 100;
  const taxaFrac = 1 - divisorTaxa;

  // mínimo seguro: custo total + 30% de colchão de segurança, já líquido da taxa de venda
  const precoMinimo = (custos.total * 1.3) / divisorTaxa;
  // preço sugerido: baseado na margem de lucro escolhida pelo usuário
  const precoSugerido = (custos.total * (1 + margemFrac)) / divisorTaxa;
  // teto de mercado: markup de 3x o custo total (referência comum em guias de precificação de impressão 3D)
  const precoMaximo = (custos.total * 3) / divisorTaxa;
  // lucro líquido estimado no preço sugerido, já descontando a taxa de venda
  const lucroEstimado = precoSugerido * (1 - taxaFrac) - custos.total;

  setText('r-material', brlFmt(custos.custoMaterial));
  setText('r-energia', brlFmt(custos.custoEnergia));
  setText('r-desgaste', brlFmt(custos.custoMaquina));
  setText('r-maoobra', brlFmt(custos.custoMaoObra));
  setText('r-embalagem', brlFmt(custos.custoEmbalagem));
  setText('r-total', brlFmt(custos.total));
  setText('r-final', brlFmt(precoSugerido));
  setText('r-lucro', brlFmt(lucroEstimado));

  desenharGrafico(precoMinimo, precoSugerido, precoMaximo);
  aplicarStatus(precoMinimo, precoSugerido, precoMaximo);
}

// Recalcula a margem de lucro necessária pra atingir um preço escolhido
// (usado ao arrastar o marcador do gráfico) e refaz o cálculo inteiro.
function updateMarginFromPrice(price) {
  const custos = getCustoTotal();
  const divisorTaxa = getDivisorTaxa();
  if (custos.total <= 0) return;

  const margemFrac = (price * divisorTaxa) / custos.total - 1;
  const margemEl = document.getElementById('margem');
  if (margemEl) margemEl.value = Math.max(0, margemFrac * 100).toFixed(0);
  calcular();
}

const STATUS_LABELS = {
  risk: { icon: '⚠️', label: 'Sem margem — risco de prejuízo', mouth: 'M30,66 Q50,52 70,66' },
  normal: { icon: '🟠', label: 'Lucro normal', mouth: 'M32,62 Q50,62 68,62' },
  excelente: { icon: '✅', label: 'Lucro excelente', mouth: 'M28,56 Q50,78 72,56' },
};

function aplicarStatus(minimo, sugerido, maximo) {
  let status;
  if (sugerido < minimo) status = 'risk';
  else if (sugerido < maximo) status = 'normal';
  else status = 'excelente';

  const { icon, label, mouth } = STATUS_LABELS[status];
  const mouthEl = document.getElementById('face-mouth');
  if (mouthEl) mouthEl.setAttribute('d', mouth);
  const classes = ['status-risk', 'status-normal', 'status-excelente'];
  const statusClass = 'status-' + status;

  ['box-preco', 'box-lucro', 'status-banner', 'chart-marker'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove(...classes);
    el.classList.add(statusClass);
  });

  setText('status-icon', icon);
  setText('status-text', label);
  setText('chart-marker-status', icon + ' ' + label);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

let lastChartDomain = null;

function desenharGrafico(minimo, sugerido, maximo) {
  let domainMin = Math.max(0, Math.min(minimo, sugerido) * 0.85);
  let domainMax = Math.max(maximo, sugerido) * 1.15;
  if (domainMax <= domainMin) domainMax = domainMin + 1;
  lastChartDomain = { min: domainMin, max: domainMax };

  const pct = (v) => clamp(((v - domainMin) / (domainMax - domainMin)) * 100, 0, 100);

  const minPct = pct(minimo);
  const maxPct = pct(maximo);
  const markerPct = pct(sugerido);

  const zoneRisk = document.getElementById('zone-risk');
  const zoneSafe = document.getElementById('zone-safe');
  const zoneHigh = document.getElementById('zone-high');
  if (zoneRisk) zoneRisk.style.width = minPct + '%';
  if (zoneSafe) zoneSafe.style.width = (maxPct - minPct) + '%';
  if (zoneHigh) zoneHigh.style.width = (100 - maxPct) + '%';

  const tickMin = document.getElementById('tick-min');
  const tickMax = document.getElementById('tick-max');
  if (tickMin) tickMin.style.left = minPct + '%';
  if (tickMax) tickMax.style.left = maxPct + '%';
  setText('tick-min-val', brlFmt(minimo));
  setText('tick-max-val', brlFmt(maximo));

  const marker = document.getElementById('chart-marker');
  if (marker) {
    marker.style.left = markerPct + '%';
    marker.setAttribute('aria-valuenow', markerPct.toFixed(0));
    marker.setAttribute('aria-valuetext', brlFmt(sugerido));
  }
  setText('chart-marker-val', brlFmt(sugerido));
}

function initChartDrag() {
  const chart = document.getElementById('price-chart');
  const marker = document.getElementById('chart-marker');
  const trackWrap = document.getElementById('chart-track-wrap');
  if (!chart || !marker || !trackWrap) return;

  let dragging = false;
  let rafId = null;

  function pctFromClientX(clientX) {
    const rect = trackWrap.getBoundingClientRect();
    return clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
  }

  function applyPct(pctValue) {
    if (!lastChartDomain) return;
    const price = lastChartDomain.min + (pctValue / 100) * (lastChartDomain.max - lastChartDomain.min);
    updateMarginFromPrice(price);
  }

  function scheduleApply(clientX) {
    const pctValue = pctFromClientX(clientX);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      applyPct(pctValue);
    });
  }

  function startDrag(clientX, pointerId) {
    dragging = true;
    chart.classList.add('dragging');
    if (pointerId !== undefined) marker.setPointerCapture(pointerId);
    scheduleApply(clientX);
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    chart.classList.remove('dragging');
  }

  marker.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    startDrag(e.clientX, e.pointerId);
  });
  marker.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    scheduleApply(e.clientX);
  });
  marker.addEventListener('pointerup', endDrag);
  marker.addEventListener('pointercancel', endDrag);

  // clicar em qualquer ponto da trilha pula o marcador pra lá
  trackWrap.addEventListener('click', (e) => {
    scheduleApply(e.clientX);
  });

  // acessibilidade: setas do teclado ajustam o preço em passos de 1%
  marker.addEventListener('keydown', (e) => {
    if (!lastChartDomain) return;
    const currentLeft = parseFloat(marker.style.left) || 50;
    const step = 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      applyPct(clamp(currentLeft - step, 0, 100));
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      applyPct(clamp(currentLeft + step, 0, 100));
      e.preventDefault();
    }
  });
}

let currentSTLResult = null;

function applySTLWeight() {
  if (!currentSTLResult) return;
  const density = parseFloat(document.getElementById('stlMaterial').value) || 1.24;
  const infill = clamp(num('stlInfill'), 0, 100);
  const solidWeight = currentSTLResult.volumeCM3 * density;
  const frac = Math.min(1, infill / 100 + 0.15);
  const estWeight = solidWeight * frac;

  setText('stlVolume', currentSTLResult.volumeCM3.toFixed(1) + ' cm³');
  setText('stlDims', currentSTLResult.dims.map(d => d.toFixed(0)).join(' × ') + ' mm');
  setText('stlWeight', estWeight.toFixed(1) + ' g');
  document.getElementById('stlResult').style.display = 'flex';

  document.getElementById('peso').value = estWeight.toFixed(1);
  calcular();
}

async function handleSTLFile(file) {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.stl') && !name.endsWith('.3mf')) {
    toast('Envie um arquivo .stl ou .3mf');
    return;
  }

  setText('stlDropzoneLabel', '⏳ Lendo ' + file.name + '...');
  try {
    currentSTLResult = await parseModelFile(file);
    applySTLWeight();
    setText('stlDropzoneLabel', '✅ ' + file.name);
    toast('Arquivo lido! Peso estimado preenchido automaticamente.');
  } catch (err) {
    currentSTLResult = null;
    setText('stlDropzoneLabel', '⚠️ Erro ao ler ' + file.name);
    document.getElementById('stlResult').style.display = 'none';
    toast(err.message || 'Não consegui ler esse arquivo. Confira se não está corrompido.');
  } finally {
    const fileInput = document.getElementById('stlFile');
    if (fileInput) fileInput.value = '';
  }
}

function initSTLImport() {
  const dropzone = document.getElementById('stlDropzone');
  const fileInput = document.getElementById('stlFile');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleSTLFile(file);
  });
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleSTLFile(file);
  });

  ['stlMaterial', 'stlInfill'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applySTLWeight);
  });
}

function initPrinterPreset() {
  const select = document.getElementById('printerPreset');
  const potencia = document.getElementById('potencia');
  if (!select || !potencia) return;

  select.addEventListener('change', () => {
    if (!select.value) return;
    potencia.value = select.value;
    calcular();
    toast('Potência preenchida com base no modelo selecionado.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSTLImport();
  initPrinterPreset();
  initChartDrag();

  document.querySelectorAll('.calc-wrap input, .calc-wrap select').forEach(input => {
    input.addEventListener('input', calcular);
  });

  const aplicarBtn = document.getElementById('aplicarDesgaste');
  if (aplicarBtn) {
    aplicarBtn.addEventListener('click', () => {
      const valorImpressora = num('valorImpressora');
      const vidaUtil = num('vidaUtil') || 1;
      const desgasteEl = document.getElementById('desgaste');
      if (desgasteEl) {
        desgasteEl.value = (valorImpressora / vidaUtil).toFixed(2);
        calcular();
      }
    });
  }

  calcular();
});
