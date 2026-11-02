// Conteúdo original (não copiado de nenhuma wiki de fabricante) sobre problemas comuns de impressão FDM.
// categoria: "adesao" | "extrusao" | "mecanico" | "temperatura" | "acabamento"
// icon: ilustração SVG original (não é foto de terceiro — evita problema de direitos autorais)
const PROBLEMAS = [
  {
    id: 1,
    categoria: "adesao",
    icon: `<svg viewBox="0 0 64 64" fill="none"><line x1="10" y1="54" x2="54" y2="54" stroke="#5c8bff" stroke-width="3" stroke-linecap="round"/><path d="M16,36 Q32,52 48,36" stroke="#5c8bff" stroke-width="3" fill="none" stroke-linecap="round"/><line x1="16" y1="36" x2="16" y2="50" stroke="#b06bff" stroke-width="2" stroke-dasharray="2 3" stroke-linecap="round"/><line x1="48" y1="36" x2="48" y2="50" stroke="#b06bff" stroke-width="2" stroke-dasharray="2 3" stroke-linecap="round"/></svg>`,
    titulo: "Peça empenando (warping)",
    causa: "Resfriamento desigual do plástico — as bordas esfriam mais rápido que o centro e encolhem, puxando a peça pra cima. É mais comum em ABS e em peças grandes e achatadas.",
    solucao: "Use a mesa aquecida na temperatura certa do material (cerca de 60°C pra PLA, 90–110°C pra ABS), limpe a mesa antes de imprimir, use um adesivo (cola bastão, laca ou fita) se necessário, imprima com borda (brim) e, pra ABS/ASA, use uma impressora fechada pra evitar correntes de ar."
  },
  {
    id: 2,
    categoria: "acabamento",
    icon: `<svg viewBox="0 0 64 64" fill="none"><line x1="14" y1="48" x2="14" y2="18" stroke="#5c8bff" stroke-width="3" stroke-linecap="round"/><line x1="50" y1="48" x2="50" y2="18" stroke="#5c8bff" stroke-width="3" stroke-linecap="round"/><path d="M14,22 Q24,28 34,22 T48,24" stroke="#b06bff" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M14,30 Q25,37 36,30 T48,32" stroke="#b06bff" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M14,38 Q23,44 32,38 T48,40" stroke="#b06bff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`,
    titulo: "Fiapos entre as peças (stringing)",
    causa: "Filamento escorrendo pelo bico durante os deslocamentos sem extrusão, geralmente por retração mal configurada, temperatura alta demais ou filamento úmido.",
    solucao: "Aumente a distância e a velocidade de retração, reduza a temperatura do bico em 5–10°C, aumente a velocidade de deslocamento (travel) e seque o filamento numa estufa ou desumidificador — fiapos em excesso costumam ser sinal de filamento com umidade."
  },
  {
    id: 3,
    categoria: "extrusao",
    icon: `<svg viewBox="0 0 64 64" fill="none"><path d="M20 16h24l-8 24h-8z" stroke="#5c8bff" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/><line x1="27" y1="22" x2="37" y2="32" stroke="#b06bff" stroke-width="3" stroke-linecap="round"/><line x1="37" y1="22" x2="27" y2="32" stroke="#b06bff" stroke-width="3" stroke-linecap="round"/><line x1="32" y1="42" x2="32" y2="50" stroke="#5c8bff" stroke-width="2" stroke-dasharray="2 3" stroke-linecap="round"/></svg>`,
    titulo: "Bico entupido (clog)",
    causa: "Resíduos de filamento carbonizado dentro do bico, geralmente por troca de temperatura sem purgar, filamento de baixa qualidade ou bico muito perto da mesa.",
    solucao: "Tente uma 'cold pull': aqueça o bico, deixe esfriar uns 10–20°C abaixo da temperatura de impressão e puxe o filamento com firmeza. Se não resolver, desmonte e limpe com agulha própria pra bico (nunca uma agulha comum) ou simplesmente troque o bico — é peça de desgaste e custa pouco."
  },
  {
    id: 4,
    categoria: "adesao",
    icon: `<svg viewBox="0 0 64 64" fill="none"><line x1="10" y1="50" x2="54" y2="50" stroke="#5c8bff" stroke-width="3" stroke-linecap="round"/><rect x="18" y="26" width="22" height="18" stroke="#5c8bff" stroke-width="3" fill="none"/><line x1="18" y1="44" x2="18" y2="50" stroke="#b06bff" stroke-width="2" stroke-dasharray="2 3" stroke-linecap="round"/><path d="M13,47 l4,-7 l4,7" stroke="#b06bff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    titulo: "Primeira camada não gruda na mesa",
    causa: "Mesa desnivelada, distância errada entre bico e mesa (Z-offset), mesa suja de gordura, ou temperatura da mesa baixa pro material.",
    solucao: "Nivele a mesa (manual ou automaticamente, se a impressora tiver sensor), limpe a mesa com álcool isopropílico antes de imprimir, ajuste o Z-offset com cuidado, e use um adesivo como cola bastão se o material pedir."
  },
  {
    id: 5,
    categoria: "mecanico",
    icon: `<svg viewBox="0 0 64 64" fill="none"><line x1="22" y1="50" x2="42" y2="50" stroke="#5c8bff" stroke-width="2.5" stroke-linecap="round"/><line x1="22" y1="44" x2="42" y2="44" stroke="#5c8bff" stroke-width="2.5" stroke-linecap="round"/><line x1="22" y1="38" x2="42" y2="38" stroke="#5c8bff" stroke-width="2.5" stroke-linecap="round"/><line x1="30" y1="30" x2="50" y2="30" stroke="#b06bff" stroke-width="2.5" stroke-linecap="round"/><line x1="30" y1="24" x2="50" y2="24" stroke="#b06bff" stroke-width="2.5" stroke-linecap="round"/><line x1="30" y1="18" x2="50" y2="18" stroke="#b06bff" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    titulo: "Camadas desalinhadas (layer shifting)",
    causa: "Correias frouxas, motor de passo perdendo passos por velocidade/aceleração altas demais, eixo travando por atrito ou obstrução, ou conector solto.",
    solucao: "Reaperte as correias X/Y, reduza velocidade e aceleração no fatiador, lubrifique hastes e trilhos se estiverem secos, e confira se nada esbarra na estrutura durante o movimento da impressora."
  },
  {
    id: 6,
    categoria: "extrusao",
    icon: `<svg viewBox="0 0 64 64" fill="none"><line x1="20" y1="48" x2="29" y2="48" stroke="#5c8bff" stroke-width="2.5" stroke-linecap="round"/><line x1="36" y1="48" x2="44" y2="48" stroke="#5c8bff" stroke-width="2.5" stroke-linecap="round"/><line x1="20" y1="40" x2="26" y2="40" stroke="#5c8bff" stroke-width="2.5" stroke-linecap="round"/><line x1="33" y1="40" x2="44" y2="40" stroke="#5c8bff" stroke-width="2.5" stroke-linecap="round"/><line x1="20" y1="32" x2="31" y2="32" stroke="#b06bff" stroke-width="2.5" stroke-linecap="round"/><line x1="38" y1="32" x2="44" y2="32" stroke="#b06bff" stroke-width="2.5" stroke-linecap="round"/><line x1="20" y1="24" x2="27" y2="24" stroke="#5c8bff" stroke-width="2.5" stroke-linecap="round"/><line x1="34" y1="24" x2="44" y2="24" stroke="#5c8bff" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    titulo: "Sub-extrusão (sai pouco filamento)",
    causa: "Fluxo de filamento menor que o necessário — bico parcialmente entupido, engrenagem do extrusor patinando, ou flow rate configurado baixo no fatiador.",
    solucao: "Limpe ou troque o bico, aumente a tensão da mola do extrusor, confira com um paquímetro se o diâmetro real do filamento bate com o configurado no fatiador, e ajuste o flow rate em incrementos pequenos (2–5%)."
  },
  {
    id: 7,
    categoria: "extrusao",
    icon: `<svg viewBox="0 0 64 64" fill="none"><rect x="18" y="18" width="16" height="32" rx="2" stroke="#5c8bff" stroke-width="3" fill="none"/><path d="M34,28c8,-2 10,6 10,10c0,6 -6,8 -10,6" stroke="#b06bff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
    titulo: "Sobre-extrusão (sai filamento demais)",
    causa: "Flow rate configurado alto demais ou diâmetro do filamento mal calibrado no fatiador, deixando as paredes da peça grossas ou com bolhas.",
    solucao: "Calibre os e-steps do extrusor, confira o diâmetro real do filamento com um paquímetro e ajuste no fatiador, e reduza o flow rate aos poucos até as paredes saírem lisas e no tamanho certo."
  },
  {
    id: 8,
    categoria: "acabamento",
    icon: `<svg viewBox="0 0 64 64" fill="none"><line x1="10" y1="52" x2="54" y2="52" stroke="#5c8bff" stroke-width="2" stroke-linecap="round" opacity="0.5"/><path d="M26,14 h12 v26 l8,8 v4 h-28 v-4 l8,-8 z" stroke="#b06bff" stroke-width="3" fill="none" stroke-linejoin="round"/></svg>`,
    titulo: "Pé de elefante (elephant foot)",
    causa: "A primeira camada é espremida pelo peso das camadas seguintes, geralmente porque o bico está muito perto da mesa ou a mesa está quente demais.",
    solucao: "Afaste levemente o bico da mesa ajustando o Z-offset, reduza um pouco a temperatura da mesa após a primeira camada, e ative a compensação de elephant foot no fatiador, se o seu tiver essa opção."
  },
  {
    id: 9,
    categoria: "temperatura",
    icon: `<svg viewBox="0 0 64 64" fill="none"><rect x="28" y="10" width="8" height="24" rx="4" stroke="#5c8bff" stroke-width="3" fill="none"/><circle cx="32" cy="40" r="8" stroke="#5c8bff" stroke-width="3" fill="none"/><line x1="32" y1="16" x2="32" y2="32" stroke="#b06bff" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="40" r="3" fill="#b06bff"/><path d="M46,18 l6,12h-12z" stroke="#b06bff" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/><line x1="46" y1="22" x2="46" y2="26" stroke="#b06bff" stroke-width="2" stroke-linecap="round"/><circle cx="46" cy="28.5" r="0.9" fill="#b06bff"/></svg>`,
    titulo: "Erro de temperatura / thermal runaway",
    causa: "A impressora detectou que a temperatura do bico ou da mesa não está respondendo como esperado — termistor solto ou danificado, resistência com defeito, ou fiação com mau contato. É uma proteção de segurança.",
    solucao: "Desligue a impressora e confira se o termistor e o cartucho de aquecimento estão bem conectados e sem fios partidos. Nunca tente burlar essa proteção — ela existe pra evitar incêndio por superaquecimento. Se persistir, o termistor ou a resistência provavelmente precisam ser trocados."
  },
  {
    id: 10,
    categoria: "mecanico",
    icon: `<svg viewBox="0 0 64 64" fill="none"><circle cx="26" cy="32" r="10" stroke="#5c8bff" stroke-width="3" fill="none"/><circle cx="26" cy="32" r="3" fill="#5c8bff"/><line x1="36" y1="32" x2="40" y2="32" stroke="#5c8bff" stroke-width="3" stroke-linecap="round"/><line x1="31" y1="23.3" x2="33" y2="19.9" stroke="#5c8bff" stroke-width="3" stroke-linecap="round"/><line x1="21" y1="23.3" x2="19" y2="19.9" stroke="#5c8bff" stroke-width="3" stroke-linecap="round"/><line x1="16" y1="32" x2="12" y2="32" stroke="#5c8bff" stroke-width="3" stroke-linecap="round"/><line x1="21" y1="40.7" x2="19" y2="44.1" stroke="#5c8bff" stroke-width="3" stroke-linecap="round"/><line x1="31" y1="40.7" x2="33" y2="44.1" stroke="#5c8bff" stroke-width="3" stroke-linecap="round"/><path d="M42,26c4,3 4,11 0,14" stroke="#b06bff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M47,22c7,5 7,15 0,20" stroke="#b06bff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
    titulo: "Barulho estranho ou motor travando",
    causa: "Correia muito solta ou muito esticada, eixo seco por falta de lubrificação, ou alguma peça/cabo obstruindo o caminho do movimento.",
    solucao: "Verifique a tensão das correias, lubrifique hastes lisas e trilhos lineares com óleo apropriado, e confira visualmente se nada está esbarrando na estrutura durante a impressão."
  },
];

// Fabricantes e onde encontrar os códigos de erro oficiais (links verificados).
// Os códigos variam por marca e até por modelo dentro da mesma marca — por isso
// aqui linkamos direto pra fonte oficial em vez de copiar tabelas que ficam
// desatualizadas rápido.
const MARCAS = [
  {
    nome: "Bambu Lab",
    icon: "🅱️",
    nota: "Usa códigos HMS (formato HMS_XXXX-XXXX-XXXX-XXXX) exibidos na tela ou no app. Busque o código direto na wiki oficial.",
    url: "https://wiki.bambulab.com/en/hms/error-code"
  },
  {
    nome: "Creality",
    icon: "🅲",
    nota: "A linha K (K1 / K1C / K1 Max) mostra códigos numéricos. A linha Ender clássica (Marlin) mostra mensagens de texto como 'Thermal Runaway' ou 'MAXTEMP'.",
    url: "https://wiki.creality.com/en/k1-flagship-series/k1-series-general-documents/error-code-summary"
  },
  {
    nome: "FlashForge",
    icon: "🅵",
    nota: "Cada linha (Adventurer 5M, AD5X, Guider 3) tem sua própria tabela de códigos na wiki oficial do fabricante.",
    url: "https://wiki.flashforge.com/en/adventurer-series/error_code_adventurer_5m"
  },
  {
    nome: "Anycubic",
    icon: "🅰️",
    nota: "Códigos numéricos de 5 dígitos (ex: 10133) específicos por modelo — o mesmo número pode significar algo diferente em outra impressora da marca.",
    url: "https://wiki.anycubic.com/en/error-codes/10133-code"
  },
  {
    nome: "Prusa",
    icon: "🅿️",
    nota: "Código de 5 dígitos (formato XXYZZ) exibido com QR Code na tela — aponte a câmera do celular e caia direto na solução.",
    url: "https://help.prusa3d.com"
  },
  {
    nome: "Elegoo",
    icon: "🅴",
    nota: "As linhas Centauri Carbon e Neptune têm páginas próprias de erro e um FAQ geral na wiki oficial.",
    url: "https://wiki.elegoo.com/en/faq"
  },
];
