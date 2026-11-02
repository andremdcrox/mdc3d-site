// Leitor de modelos 3D (.stl e .3mf) 100% client-side — o arquivo nunca sai do navegador.
// Calcula o volume do sólido somando o volume assinado de cada triângulo
// em relação à origem (método padrão pra malhas fechadas/manifold).

function signedVolumeOfTriangle(p1, p2, p3) {
  return (
    p1[0] * (p2[1] * p3[2] - p3[1] * p2[2]) -
    p1[1] * (p2[0] * p3[2] - p3[0] * p2[2]) +
    p1[2] * (p2[0] * p3[1] - p3[0] * p2[1])
  ) / 6.0;
}

function updateBounds(v, min, max) {
  for (let i = 0; i < 3; i++) {
    if (v[i] < min[i]) min[i] = v[i];
    if (v[i] > max[i]) max[i] = v[i];
  }
}

function finalizeResult(volume, min, max, triCount) {
  const volumeMM3 = Math.abs(volume);
  const dims = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return { volumeMM3, volumeCM3: volumeMM3 / 1000, dims, triCount };
}

/* ---------------------------- STL ---------------------------- */

function parseBinarySTL(view, triCount) {
  let volume = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let offset = 84;

  for (let i = 0; i < triCount; i++) {
    offset += 12; // normal (ignorado)
    const v1 = [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)];
    offset += 12;
    const v2 = [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)];
    offset += 12;
    const v3 = [view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)];
    offset += 12;
    offset += 2; // attribute byte count

    volume += signedVolumeOfTriangle(v1, v2, v3);
    updateBounds(v1, min, max);
    updateBounds(v2, min, max);
    updateBounds(v3, min, max);
  }

  return finalizeResult(volume, min, max, triCount);
}

function parseAsciiSTL(text) {
  const vertRe = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  const verts = [];
  let m;
  while ((m = vertRe.exec(text))) {
    verts.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]);
  }
  if (verts.length < 3) throw new Error('Nenhum triângulo encontrado no arquivo.');

  let volume = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i + 2 < verts.length; i += 3) {
    volume += signedVolumeOfTriangle(verts[i], verts[i + 1], verts[i + 2]);
    updateBounds(verts[i], min, max);
    updateBounds(verts[i + 1], min, max);
    updateBounds(verts[i + 2], min, max);
  }

  return finalizeResult(volume, min, max, Math.floor(verts.length / 3));
}

function parseSTL(arrayBuffer) {
  // Primeiro tenta binário: o tamanho do arquivo bate com o header (84 bytes + N*50)?
  if (arrayBuffer.byteLength >= 84) {
    const view = new DataView(arrayBuffer);
    const triCount = view.getUint32(80, true);
    const expectedBinarySize = 84 + triCount * 50;
    if (triCount > 0 && expectedBinarySize === arrayBuffer.byteLength) {
      return parseBinarySTL(view, triCount);
    }
  }

  // Tenta ASCII (precisa ter "solid" + "facet normal", não só a palavra solid)
  const text = new TextDecoder().decode(arrayBuffer);
  if (/^\s*solid\b/i.test(text) && /facet\s+normal/i.test(text)) {
    return parseAsciiSTL(text);
  }

  // Fallback: muitos exportadores geram binário com alguns bytes extras de
  // sobra no final (padding/metadata) — se o tamanho bate "pra mais", ainda
  // dá pra ler como binário em vez de rejeitar o arquivo.
  if (arrayBuffer.byteLength > 84) {
    const view = new DataView(arrayBuffer);
    const triCount = view.getUint32(80, true);
    if (triCount > 0 && 84 + triCount * 50 <= arrayBuffer.byteLength) {
      return parseBinarySTL(view, triCount);
    }
  }

  throw new Error('Formato de arquivo não reconhecido como STL.');
}

/* ---------------------------- 3MF ---------------------------- */
/* .3mf é um ZIP contendo XML (3D/3dmodel.model). Lemos o ZIP na mão
   (sem biblioteca externa) e descomprimimos com a API nativa do
   navegador (DecompressionStream), já que o ZIP usa DEFLATE puro. */

async function readZipEntryData(view, bytes, entry) {
  const LFH_SIG = 0x04034b50;
  const lo = entry.localHeaderOffset;
  if (view.getUint32(lo, true) !== LFH_SIG) {
    throw new Error('Arquivo .3mf corrompido (cabeçalho local do ZIP inválido).');
  }

  const nameLen = view.getUint16(lo + 26, true);
  const extraLen = view.getUint16(lo + 28, true);
  const dataStart = lo + 30 + nameLen + extraLen;
  const compressedData = bytes.subarray(dataStart, dataStart + entry.compSize);

  if (entry.compMethod === 0) return compressedData; // sem compressão (stored)

  if (entry.compMethod === 8) { // DEFLATE
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Seu navegador não suporta leitura de .3mf (API de descompressão ausente). Tente um navegador mais recente ou use um arquivo .stl.');
    }
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([compressedData]).stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }

  throw new Error('Método de compressão do .3mf não suportado.');
}

async function extractZipEntry(arrayBuffer, targetPath) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);

  const EOCD_SIG = 0x06054b50;
  let eocdOffset = -1;
  const maxCommentLen = 65535;
  const searchStart = Math.max(0, bytes.length - 22 - maxCommentLen);
  for (let i = bytes.length - 22; i >= searchStart; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) throw new Error('Arquivo .3mf inválido (não parece ser um ZIP).');

  const cdEntryCount = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  let offset = cdOffset;
  const CD_SIG = 0x02014b50;
  let found = null;
  let fallbackModel = null;

  for (let i = 0; i < cdEntryCount; i++) {
    if (view.getUint32(offset, true) !== CD_SIG) break;
    const compMethod = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder('utf-8').decode(bytes.subarray(offset + 46, offset + 46 + nameLen));

    const entry = { name, compMethod, compSize, localHeaderOffset };
    if (name === targetPath) { found = entry; break; }
    if (!fallbackModel && /\.model$/i.test(name)) fallbackModel = entry;

    offset += 46 + nameLen + extraLen + commentLen;
  }

  const entry = found || fallbackModel;
  if (!entry) throw new Error('Não encontrei o modelo 3D dentro do arquivo .3mf.');
  return readZipEntryData(view, bytes, entry);
}

const MF_UNIT_TO_MM = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };

async function parse3MF(arrayBuffer) {
  const modelXmlBytes = await extractZipEntry(arrayBuffer, '3D/3dmodel.model');
  const xmlText = new TextDecoder('utf-8').decode(modelXmlBytes);
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

  if (doc.querySelector('parsererror')) {
    throw new Error('Não consegui interpretar o XML do arquivo 3MF.');
  }

  const modelEl = doc.getElementsByTagNameNS('*', 'model')[0];
  const unit = (modelEl && modelEl.getAttribute('unit')) || 'millimeter';
  const scale = MF_UNIT_TO_MM[unit] || 1;

  let volume = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triCount = 0;

  const meshes = doc.getElementsByTagNameNS('*', 'mesh');
  for (const mesh of meshes) {
    const vertexEls = mesh.getElementsByTagNameNS('*', 'vertex');
    const verts = [];
    for (const v of vertexEls) {
      verts.push([
        parseFloat(v.getAttribute('x')) * scale,
        parseFloat(v.getAttribute('y')) * scale,
        parseFloat(v.getAttribute('z')) * scale,
      ]);
    }
    const triEls = mesh.getElementsByTagNameNS('*', 'triangle');
    for (const t of triEls) {
      const p1 = verts[parseInt(t.getAttribute('v1'), 10)];
      const p2 = verts[parseInt(t.getAttribute('v2'), 10)];
      const p3 = verts[parseInt(t.getAttribute('v3'), 10)];
      if (!p1 || !p2 || !p3) continue;
      volume += signedVolumeOfTriangle(p1, p2, p3);
      updateBounds(p1, min, max);
      updateBounds(p2, min, max);
      updateBounds(p3, min, max);
      triCount++;
    }
  }

  if (triCount === 0) throw new Error('Nenhuma malha encontrada no arquivo 3MF.');
  return finalizeResult(volume, min, max, triCount);
}

/* ---------------------------- Dispatcher ---------------------------- */

async function parseModelFile(file) {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.3mf')) return parse3MF(buffer);
  if (name.endsWith('.stl')) return parseSTL(buffer);
  throw new Error('Formato não suportado — envie um arquivo .stl ou .3mf.');
}
