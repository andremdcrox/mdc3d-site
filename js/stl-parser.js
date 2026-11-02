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

function indexZipEntries(arrayBuffer) {
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
  const entries = new Map();

  for (let i = 0; i < cdEntryCount; i++) {
    if (view.getUint32(offset, true) !== CD_SIG) break;
    const compMethod = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder('utf-8').decode(bytes.subarray(offset + 46, offset + 46 + nameLen));

    entries.set(name, { compMethod, compSize, localHeaderOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }

  return { bytes, view, entries };
}

async function readZipEntryByName(zip, name) {
  const entry = zip.entries.get(name);
  if (!entry) return null;
  return readZipEntryData(zip.view, zip.bytes, entry);
}

const MF_UNIT_TO_MM = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };

function parse3MFTransform(str) {
  if (!str) return null;
  const n = str.trim().split(/\s+/).map(Number);
  if (n.length !== 12 || n.some(Number.isNaN)) return null;
  return n; // [m00,m01,m02, m10,m11,m12, m20,m21,m22, m30,m31,m32] (linha a linha, 4x3)
}

function apply3MFTransform(v, m) {
  if (!m) return v;
  return [
    v[0] * m[0] + v[1] * m[3] + v[2] * m[6] + m[9],
    v[0] * m[1] + v[1] * m[4] + v[2] * m[7] + m[10],
    v[0] * m[2] + v[1] * m[5] + v[2] * m[8] + m[11],
  ];
}

function combine3MFTransforms(inner, outer) {
  // combina transform de um <component> (inner) com o transform acumulado do pai (outer):
  // ponto final = outer(inner(ponto)) — aplica inner primeiro, depois outer.
  if (!inner) return outer;
  if (!outer) return inner;
  const toMat4 = (m) => [
    [m[0], m[1], m[2], 0],
    [m[3], m[4], m[5], 0],
    [m[6], m[7], m[8], 0],
    [m[9], m[10], m[11], 1],
  ];
  const A = toMat4(inner), B = toMat4(outer);
  const R = [];
  for (let i = 0; i < 4; i++) {
    R[i] = [];
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += A[i][k] * B[k][j];
      R[i][j] = s;
    }
  }
  return [R[0][0], R[0][1], R[0][2], R[1][0], R[1][1], R[1][2], R[2][0], R[2][1], R[2][2], R[3][0], R[3][1], R[3][2]];
}

// Extração por regex em vez de DOMParser — arquivos de malha de fatiadores
// podem ter dezenas de MB e milhões de triângulos; montar uma árvore DOM pra
// isso é lento demais (testado: ~20s num modelo de 2,6M triângulos). Como o
// XML do 3MF é bem regular, ler direto do texto é muito mais rápido.

function getAttr(attrsStr, name) {
  const m = new RegExp('\\b' + name + '="([^"]*)"').exec(attrsStr);
  return m ? m[1] : null;
}

function extractObjectBlock(text, objectId) {
  const re = new RegExp('<object\\b[^>]*\\bid="' + objectId + '"[^>]*>([\\s\\S]*?)<\\/object>', 'i');
  const m = re.exec(text);
  return m ? m[1] : null;
}

function extractMeshVertsTris(objectBlock) {
  const meshMatch = /<mesh\b[^>]*>([\s\S]*?)<\/mesh>/i.exec(objectBlock);
  if (!meshMatch) return null;
  const meshText = meshMatch[1];

  const verts = [];
  const vertRe = /<vertex\s+x="([^"]*)"\s+y="([^"]*)"\s+z="([^"]*)"/g;
  let vm;
  while ((vm = vertRe.exec(meshText))) verts.push([parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3])]);

  const tris = [];
  const triRe = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/g;
  let tm;
  while ((tm = triRe.exec(meshText))) tris.push([parseInt(tm[1], 10), parseInt(tm[2], 10), parseInt(tm[3], 10)]);

  return { verts, tris };
}

function extractComponents(objectBlock) {
  const comps = [];
  const compRe = /<component\b([^>]*?)\/?>/g;
  let cm;
  while ((cm = compRe.exec(objectBlock))) {
    const attrs = cm[1];
    const objectid = getAttr(attrs, 'objectid');
    if (!objectid) continue;
    comps.push({
      objectid,
      transform: getAttr(attrs, 'transform'),
      path: getAttr(attrs, 'p:path') || getAttr(attrs, 'path'),
    });
  }
  return comps;
}

function extractBuildItems(fullText) {
  const buildMatch = /<build\b[^>]*>([\s\S]*?)<\/build>/i.exec(fullText);
  const buildBlock = buildMatch ? buildMatch[1] : '';
  const items = [];
  const itemRe = /<item\b([^>]*?)\/?>/g;
  let im;
  while ((im = itemRe.exec(buildBlock))) {
    const attrs = im[1];
    const objectid = getAttr(attrs, 'objectid');
    if (objectid) items.push({ objectid, transform: getAttr(attrs, 'transform') });
  }
  return items;
}

async function parse3MF(arrayBuffer) {
  // Fatiadores como o Bambu Studio/OrcaSlicer costumam dividir o modelo em
  // vários arquivos dentro do mesmo .3mf (um por peça), e o arquivo principal
  // só referencia os outros via <component p:path="...">. Por isso lemos o
  // índice do ZIP uma vez e resolvemos cada referência sob demanda.
  const zip = indexZipEntries(arrayBuffer);

  let mainPath = '3D/3dmodel.model';
  if (!zip.entries.has(mainPath)) {
    const found = [...zip.entries.keys()].find((n) => /\.model$/i.test(n));
    if (!found) throw new Error('Não encontrei o modelo 3D dentro do arquivo .3mf.');
    mainPath = found;
  }

  const textCache = new Map();
  async function getText(path) {
    const clean = path.replace(/^\/+/, '');
    if (textCache.has(clean)) return textCache.get(clean);
    const dataBytes = await readZipEntryByName(zip, clean);
    if (!dataBytes) throw new Error('Não encontrei uma das peças referenciadas no arquivo 3MF (' + clean + ').');
    const text = new TextDecoder('utf-8').decode(dataBytes);
    textCache.set(clean, text);
    return text;
  }

  const mainText = await getText(mainPath);
  const unitMatch = /<model\b[^>]*\bunit="([^"]*)"/i.exec(mainText);
  const scale = MF_UNIT_TO_MM[unitMatch ? unitMatch[1] : 'millimeter'] || 1;

  let volume = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triCount = 0;

  async function processRef(path, objectId, transform, depth) {
    if (depth > 12 || !objectId) return; // guarda contra referência circular/profundidade excessiva

    const text = path ? await getText(path) : mainText;
    const block = extractObjectBlock(text, objectId);
    if (block === null) return;

    const meshData = extractMeshVertsTris(block);
    if (meshData) {
      const verts = new Array(meshData.verts.length);
      for (let i = 0; i < meshData.verts.length; i++) {
        const v = meshData.verts[i];
        verts[i] = apply3MFTransform([v[0] * scale, v[1] * scale, v[2] * scale], transform);
      }
      for (let i = 0; i < meshData.tris.length; i++) {
        const [i1, i2, i3] = meshData.tris[i];
        const p1 = verts[i1], p2 = verts[i2], p3 = verts[i3];
        if (!p1 || !p2 || !p3) continue;
        volume += signedVolumeOfTriangle(p1, p2, p3);
        updateBounds(p1, min, max);
        updateBounds(p2, min, max);
        updateBounds(p3, min, max);
        triCount++;
      }
    }

    const comps = extractComponents(block);
    for (let i = 0; i < comps.length; i++) {
      const comp = comps[i];
      const compTransform = parse3MFTransform(comp.transform);
      const combined = combine3MFTransforms(compTransform, transform);
      await processRef(comp.path, comp.objectid, combined, depth + 1);
    }
  }

  const buildItems = extractBuildItems(mainText);
  if (buildItems.length > 0) {
    for (let i = 0; i < buildItems.length; i++) {
      const transform = parse3MFTransform(buildItems[i].transform);
      await processRef(null, buildItems[i].objectid, transform, 0);
    }
  } else {
    // sem <build> (incomum) — soma todos os objetos do arquivo principal como estão
    const ids = [...mainText.matchAll(/<object\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    for (const id of ids) await processRef(null, id, null, 0);
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
