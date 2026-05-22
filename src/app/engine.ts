import { ArrowDir, Board, Cell, Entry } from './board';

export interface Model {
  grid: (Cell | null)[][];
  entries: Entry[];
}

function makeCell(row: number, col: number, kind: 'letter' | 'clue'): Cell {
  return { row, col, kind, answer: '', secretN: null, across: null, down: null, clues: [] };
}

function step(dir: ArrowDir): [number, number] {
  return dir === 'down' ? [1, 0] : [0, 1];
}

/**
 * Buduje model krzyżówki szwedzkiej:
 * - kratki z pytaniami (mogą mieć 2 pytania: w prawo i w dół),
 * - odpowiedzi startują w polu sąsiednim zgodnie ze strzałką,
 * - litery wspólne (przecięcia) muszą się zgadzać,
 * - pola hasła dostają numerki.
 * Pola nieużyte zostają puste (null).
 */
export function buildModel(board: Board): Model {
  const grid: (Cell | null)[][] = Array.from({ length: board.rows }, () =>
    Array<Cell | null>(board.cols).fill(null),
  );
  const entries: Entry[] = [];

  for (const def of board.clues) {
    const [cr, cc] = def.at;
    let clueCell = grid[cr]?.[cc] ?? null;
    if (!clueCell) {
      clueCell = makeCell(cr, cc, 'clue');
      grid[cr][cc] = clueCell;
    }
    if (clueCell.kind !== 'clue') {
      console.warn(`Pole pytania (${cr},${cc}) koliduje z polem na literę`);
    }
    clueCell.clues.push({ dir: def.dir, text: def.text });

    const answer = def.answer.toUpperCase();
    const entry: Entry = { dir: def.dir, cells: [], answer, text: def.text, clueAt: def.at };
    const [dr, dc] = step(def.dir);
    for (let i = 0; i < answer.length; i++) {
      const r = cr + dr * (i + 1);
      const c = cc + dc * (i + 1);
      if (r < 0 || r >= board.rows || c < 0 || c >= board.cols) {
        console.warn(`Odpowiedź "${answer}" wychodzi poza planszę z (${cr},${cc})`);
        break;
      }
      let cell = grid[r][c];
      if (!cell) {
        cell = makeCell(r, c, 'letter');
        grid[r][c] = cell;
      }
      if (cell.kind !== 'letter') {
        console.warn(`Litera "${answer}" trafia na pole pytania w (${r},${c})`);
      }
      if (cell.answer && cell.answer !== answer[i]) {
        console.warn(`Konflikt liter w (${r},${c}): "${cell.answer}" vs "${answer[i]}"`);
      }
      cell.answer = answer[i];
      if (def.dir === 'right') cell.across = entry;
      else cell.down = entry;
      entry.cells.push(cell);
    }
    entries.push(entry);
  }

  for (const s of board.secretCells) {
    const cell = grid[s.at[0]]?.[s.at[1]] ?? null;
    if (cell && cell.kind === 'letter') cell.secretN = s.n;
    else console.warn(`Pole hasła (${s.at[0]},${s.at[1]}) nie jest polem na literę`);
  }

  return { grid, entries };
}
