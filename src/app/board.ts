// Model krzyżówki szwedzkiej (z strzałkami): pytanie siedzi w kratce,
// strzałka (w prawo / w dół) wskazuje, gdzie wpisać odpowiedź.

export type ArrowDir = 'right' | 'down';

/** Pojedyncze pytanie (dane wejściowe). */
export interface ClueDef {
  at: [number, number]; // [wiersz, kolumna] kratki z pytaniem
  dir: ArrowDir; // kierunek strzałki — odpowiedź startuje w sąsiednim polu
  answer: string; // odpowiedź (wielkie litery, bez ogonków)
  text: string; // krótka treść pytania (mieści się w kratce)
}

/** Pole zasilające hasło na dole; n = kolejność litery w haśle. */
export interface SecretCellDef {
  n: number;
  at: [number, number];
}

/** Pełny opis planszy (dane wejściowe). */
export interface Board {
  id: string;
  title: string;
  rows: number;
  cols: number;
  secret: string; // ładna forma hasła do pokazania (np. "KSIĘŻNICZKA")
  clues: ClueDef[];
  secretCells: SecretCellDef[];
}

/** Pytanie wewnątrz kratki (po zbudowaniu modelu kratka może mieć ich 2). */
export interface ClueInCell {
  dir: ArrowDir;
  text: string;
}

/** Słowo po zbudowaniu modelu. */
export interface Entry {
  dir: ArrowDir;
  cells: Cell[];
  answer: string;
  text: string;
  clueAt: [number, number];
}

/** Kratka planszy: z pytaniem ('clue') albo na literę ('letter'). */
export interface Cell {
  row: number;
  col: number;
  kind: 'letter' | 'clue';
  // dla 'letter':
  answer: string;
  secretN: number | null;
  across: Entry | null; // dir 'right'
  down: Entry | null; // dir 'down'
  // dla 'clue':
  clues: ClueInCell[];
}
