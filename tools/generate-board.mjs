// Generator krzyżówki szwedzkiej z losowymi restartami.
// Próbuje wielu kolejności słów i wybiera układ, który zmieści WSZYSTKIE słowa
// w najmniejszej siatce oraz pozwoli ułożyć hasło.
// Użycie: node tools/generate-board.mjs [board1|board2]
// Wypisuje gotowy obiekt planszy do wklejenia w src/app/boards.ts.

// [odpowiedź (BEZ OGONKÓW), treść pytania (krótko, kreatywnie)]
const CONFIGS = {
  board1: {
    seed: 20260522,
    secret: 'KSIEZNICZKA',
    words: [
      ['KRETA', 'Wyspa Zeusa'],
      ['SANTORINI', 'Grecka wyspa'],
      ['MALTA', 'Wyspa Rafiego'],
      ['SYCYLIA', 'Wyspa obok Malty'],
      ['NIL', 'Najdłuższa rzeka świata'],
      ['SEKWANA', 'Rzeka Paryża'],
      ['WULKAN', 'Etna albo ten z Teneryfy'],
      ['KOMPAS', 'Wskazuje północ'],
      ['ATOM', 'Najmniejszy kawałek pierwiastka'],
      ['CUKIER', 'C₁₂H₂₂O₁₁'],
      ['AZOT', '78% powietrza'],
      ['KOMETA', 'Z warkoczem na niebie'],
      ['TIKTOK', 'Zegar albo aplikacja'],
      ['ZARA', 'Hiszpańska sieciówka'],
      ['FERRARI', 'Koń z Maranello'],
      ['TIARA', 'Diadem księżniczki'],
      ['ZAMEK', 'Z wieżą i fosą'],
      ['DIAMENT', 'Na pierścionku'],
      ['RAFI', 'Maltańczyk'],
      ['HELENA', 'Imię lalek z Kosiny'],
    ],
  },
  board2: {
    id: 'board2-jowisz-v4',
    seed: 20260905,
    secret: 'JOWISZ',
    unlockWith: 'KSIEZNICZKA',
    words: [
      ['TYGRYSEK', 'Kot z Węglisk'],
      ['GOZO', 'Mini Malta'],
      ['RAKI', 'Kreta: nie zamawialiśmy, ale wypiliśmy'],
      ['GALAKTYKA', 'Miliardy gwiazd'],
      ['MALEDIWY', 'Ulubiona wyspa'],
      ['MAJORKA', 'Zwiedzona Audi'],
      ['BESTIA', 'Czarne BMW'],
      ['PILATES', 'Najcięższy trening'],
      ['MASAŻ', 'Hotel i…'],
    ],
  },
};

const NAME = process.argv[2] || 'board2';
const CONFIG = CONFIGS[NAME];
if (!CONFIG) {
  console.error('Nieznana plansza:', NAME);
  process.exit(1);
}
const WORDS = CONFIG.words;
const SECRET = CONFIG.secret;
const K = (r, c) => r + ',' + c;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(order) {
  const letters = new Map();
  const clueCells = new Set();
  const placements = [];
  let ext = null;
  const get = (r, c) => letters.get(K(r, c));
  const grow = (r, c) => {
    if (!ext) ext = { mnR: r, mnC: c, mxR: r, mxC: c };
    else {
      ext.mnR = Math.min(ext.mnR, r); ext.mnC = Math.min(ext.mnC, c);
      ext.mxR = Math.max(ext.mxR, r); ext.mxC = Math.max(ext.mxC, c);
    }
  };

  function canPlace(word, dir, r, c) {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    if (get(r - dr, c - dc) !== undefined) return false;
    if (get(r + dr * word.length, c + dc * word.length) !== undefined) return false;
    let cross = 0;
    for (let i = 0; i < word.length; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      if (clueCells.has(K(rr, cc))) return false;
      const cur = get(rr, cc);
      if (cur !== undefined) {
        if (cur !== word[i]) return false;
        cross++;
      } else if (dir === 'across') {
        if (get(rr - 1, cc) !== undefined || get(rr + 1, cc) !== undefined) return false;
      } else {
        if (get(rr, cc - 1) !== undefined || get(rr, cc + 1) !== undefined) return false;
      }
    }
    return cross;
  }
  function spread(word, dir, r, c) {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    let mnR = ext.mnR, mnC = ext.mnC, mxR = ext.mxR, mxC = ext.mxC;
    const upd = (rr, cc) => { mnR = Math.min(mnR, rr); mnC = Math.min(mnC, cc); mxR = Math.max(mxR, rr); mxC = Math.max(mxC, cc); };
    upd(r - dr, c - dc);
    for (let i = 0; i < word.length; i++) upd(r + dr * i, c + dc * i);
    return mxR - mnR + (mxC - mnC);
  }
  function place(word, clue, dir, r, c) {
    const dr = dir === 'down' ? 1 : 0;
    const dc = dir === 'across' ? 1 : 0;
    for (let i = 0; i < word.length; i++) { letters.set(K(r + dr * i, c + dc * i), word[i]); grow(r + dr * i, c + dc * i); }
    clueCells.add(K(r - dr, c - dc)); grow(r - dr, c - dc);
    placements.push({ answer: word, clue, dir, r, c });
  }

  place(order[0][0], order[0][1], 'across', 0, 0);
  const failed = [];
  for (let w = 1; w < order.length; w++) {
    const [word, clue] = order[w];
    let best = null;
    for (const [pos, ch] of letters) {
      const [er, ec] = pos.split(',').map(Number);
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== ch) continue;
        for (const dir of ['across', 'down']) {
          const r = dir === 'across' ? er : er - i;
          const c = dir === 'across' ? ec - i : ec;
          const cr = canPlace(word, dir, r, c);
          if (!cr) continue;
          const sp = spread(word, dir, r, c);
          if (!best || cr > best.cr || (cr === best.cr && sp < best.sp)) best = { dir, r, c, cr, sp };
        }
      }
    }
    if (best) place(word, clue, best.dir, best.r, best.c);
    else failed.push(word);
  }
  return { letters, clueCells, placements, failed, ext };
}

// liczba różnych komórek na każdą potrzebną literę musi wystarczyć na hasło
function secretFeasible(letters) {
  const need = {};
  for (const ch of SECRET) need[ch] = (need[ch] || 0) + 1;
  const have = {};
  for (const ch of letters.values()) have[ch] = (have[ch] || 0) + 1;
  return Object.entries(need).every(([ch, n]) => (have[ch] || 0) >= n);
}

// --- losowe restarty: wybierz najlepszy układ ---
const rng = mulberry32(CONFIG.seed);
let best = null;
for (let t = 0; t < 3000; t++) {
  const order = [...WORDS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const res = generate(order);
  if (!secretFeasible(res.letters)) continue;
  const size = res.ext.mxR - res.ext.mnR + (res.ext.mxC - res.ext.mnC);
  const placed = res.placements.length;
  if (!best || placed > best.placed || (placed === best.placed && size < best.size)) {
    best = { res, placed, size };
  }
}
if (!best) { console.error('Nie znaleziono układu'); process.exit(1); }

const { letters, clueCells, placements, failed, ext } = best.res;
const rows = ext.mxR - ext.mnR + 1;
const cols = ext.mxC - ext.mnC + 1;
const SH = (r, c) => [r - ext.mnR, c - ext.mnC];

const clues = placements.map((p) => {
  const dr = p.dir === 'down' ? 1 : 0;
  const dc = p.dir === 'across' ? 1 : 0;
  const [ar, ac] = SH(p.r - dr, p.c - dc);
  return { at: [ar, ac], dir: p.dir === 'across' ? 'right' : 'down', answer: p.answer, text: p.clue };
});

// --- wybór pól na hasło, rozproszone po różnych słowach ---
const cellWord = new Map();
for (const p of placements) {
  const dr = p.dir === 'down' ? 1 : 0;
  const dc = p.dir === 'across' ? 1 : 0;
  for (let i = 0; i < p.answer.length; i++) {
    const [rr, cc] = SH(p.r + dr * i, p.c + dc * i);
    if (!cellWord.has(K(rr, cc))) cellWord.set(K(rr, cc), p.answer);
  }
}
const letterCells = [];
for (const [pos, ch] of letters) { const [r, c] = pos.split(',').map(Number); const [sr, sc] = SH(r, c); letterCells.push({ r: sr, c: sc, ch }); }
const usedCells = new Set();
const usedWords = new Set();
const secretCells = [];
for (let i = 0; i < SECRET.length; i++) {
  const cands = letterCells.filter((x) => x.ch === SECRET[i] && !usedCells.has(K(x.r, x.c)));
  const pick = cands.find((x) => !usedWords.has(cellWord.get(K(x.r, x.c)))) ?? cands[0];
  usedCells.add(K(pick.r, pick.c));
  usedWords.add(cellWord.get(K(pick.r, pick.c)));
  secretCells.push({ n: i + 1, at: [pick.r, pick.c] });
}

// --- weryfikacja (odbudowa jak silnik Angulara) ---
function verify() {
  const g = new Map(); const cc = new Set();
  for (const cl of clues) {
    cc.add(K(cl.at[0], cl.at[1]));
    const dr = cl.dir === 'down' ? 1 : 0;
    const dc = cl.dir === 'right' ? 1 : 0;
    for (let i = 0; i < cl.answer.length; i++) {
      const r = cl.at[0] + dr * (i + 1), c = cl.at[1] + dc * (i + 1);
      const key = K(r, c);
      if (cc.has(key)) return `litera na polu pytania ${key}`;
      const prev = g.get(key);
      if (prev !== undefined && prev !== cl.answer[i]) return `konflikt ${key}: ${prev} vs ${cl.answer[i]}`;
      g.set(key, cl.answer[i]);
    }
  }
  let s = '';
  for (const x of [...secretCells].sort((a, b) => a.n - b.n)) s += g.get(K(x.at[0], x.at[1])) ?? '?';
  return s === SECRET ? null : `hasło źle: ${s}`;
}
const err = verify();
if (err) { console.error('WERYFIKACJA NIEUDANA:', err); process.exit(1); }

// --- podgląd ---
const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
for (const cl of clues) grid[cl.at[0]][cl.at[1]] = '#';
for (const c of letterCells) grid[c.r][c.c] = c.ch;
for (const s of secretCells) grid[s.at[0]][s.at[1]] = letterCells.find((x) => x.r === s.at[0] && x.c === s.at[1]).ch.toLowerCase();
console.log(`\nSiatka ${rows}x${cols}, słów: ${placements.length}/${WORDS.length}, odrzucone: ${failed.join(', ') || '—'}`);
console.log(grid.map((row) => row.join(' ')).join('\n'));
console.log('\nHasło =', SECRET, '| pola (małe litery) rozproszone po słowach');

// --- wypisz obiekt planszy do wklejenia w boards.ts ---
const fmtClues = clues.map((c) => `      { at: [${c.at[0]}, ${c.at[1]}], dir: '${c.dir}', answer: '${c.answer}', text: '${c.text.replace(/'/g, "\\'")}' },`).join('\n');
const fmtSecret = secretCells.map((s) => `      { n: ${s.n}, at: [${s.at[0]}, ${s.at[1]}] },`).join('\n');
console.log(`\n  // --- do wklejenia w src/app/boards.ts ---
  {
    id: '${CONFIG.id ?? NAME}',
    title: 'Plansza nr ${NAME.replace('board', '')}',
    rows: ${rows},
    cols: ${cols},
    secret: '${SECRET}',${CONFIG.unlockWith ? `
    unlockWith: '${CONFIG.unlockWith}',` : ''}
    clues: [
${fmtClues}
    ],
    secretCells: [
${fmtSecret}
    ],
  },`);
