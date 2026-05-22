import { AfterViewInit, Component, ElementRef, HostListener, signal, viewChild } from '@angular/core';
import { ArrowDir, Board, Cell, Entry } from '../board';
import { BOARDS } from '../boards';
import { buildModel } from '../engine';

const LETTER_RE = /[A-ZĄĆĘŁŃÓŚŹŻ]/;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.2;

@Component({
  selector: 'app-crossword',
  templateUrl: './crossword.html',
  styleUrl: './crossword.scss',
})
export class Crossword implements AfterViewInit {
  readonly board: Board = BOARDS[0];
  readonly grid: (Cell | null)[][];
  private readonly entries: Entry[];

  readonly inputs = signal<Record<string, string>>({});
  readonly current = signal<{ row: number; col: number } | null>(null);
  readonly dir = signal<ArrowDir>('right');
  readonly wrong = signal<ReadonlySet<string>>(new Set());
  readonly solved = signal(false);
  readonly zoom = signal(1);
  readonly message = signal('');

  private readonly boardEl = viewChild<ElementRef<HTMLDivElement>>('boardEl');
  private readonly viewportEl = viewChild<ElementRef<HTMLDivElement>>('viewportEl');

  private wasActive = false;
  private lastClueKey: string | null = null;
  private lastClueIdx = 0;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly storageKey: string;

  constructor() {
    const model = buildModel(this.board);
    this.grid = model.grid;
    this.entries = model.entries;
    this.storageKey = 'kk_progress_' + this.board.id;
    this.load();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.fit(), 0);
  }

  // ---------- pomocnicze ----------
  key(r: number, c: number): string {
    return r + ',' + c;
  }
  val(r: number, c: number): string {
    return this.inputs()[this.key(r, c)] ?? '';
  }
  private cellAt(r: number, c: number): Cell | null {
    return this.grid[r]?.[c] ?? null;
  }
  arrowGlyph(dir: ArrowDir): string {
    return dir === 'down' ? '▼' : '▶';
  }

  activeEntry(): Entry | null {
    const cur = this.current();
    if (!cur) return null;
    const cell = this.cellAt(cur.row, cur.col);
    if (!cell || cell.kind !== 'letter') return null;
    return this.dir() === 'down' ? cell.down : cell.across;
  }
  isInEntry(r: number, c: number): boolean {
    const e = this.activeEntry();
    return !!e && e.cells.some((cl) => cl.row === r && cl.col === c);
  }
  isActive(r: number, c: number): boolean {
    const cur = this.current();
    return !!cur && cur.row === r && cur.col === c;
  }
  isWrong(r: number, c: number): boolean {
    return this.wrong().has(this.key(r, c));
  }

  // pasek hasła na dole
  secretBoxes(): { n: number; letter: string }[] {
    return [...this.board.secretCells]
      .sort((a, b) => a.n - b.n)
      .map((s) => ({ n: s.n, letter: this.val(s.at[0], s.at[1]) }));
  }

  // ---------- nawigacja ----------
  private setCurrent(r: number, c: number, focus = true): void {
    const cell = this.cellAt(r, c);
    if (!cell || cell.kind !== 'letter') return;
    const d = this.dir();
    if (d === 'down' && !cell.down) this.dir.set('right');
    else if (d === 'right' && !cell.across) this.dir.set('down');
    if (!cell.across && !cell.down) return;
    this.current.set({ row: r, col: c });
    if (focus) this.focusCell(r, c);
  }

  private focusCell(r: number, c: number): void {
    const host = this.boardEl()?.nativeElement;
    const el = host?.querySelector<HTMLInputElement>(`input[data-key="${r},${c}"]`);
    if (el) {
      el.focus();
      el.select();
    }
  }

  onFocus(r: number, c: number): void {
    this.setCurrent(r, c, false);
  }
  onPointerDown(r: number, c: number): void {
    const cur = this.current();
    this.wasActive = !!cur && cur.row === r && cur.col === c;
  }
  onClick(r: number, c: number): void {
    if (this.wasActive) this.toggleDir(r, c);
  }
  private toggleDir(r: number, c: number): void {
    const cell = this.cellAt(r, c);
    if (!cell || cell.kind !== 'letter') return;
    const other: ArrowDir = this.dir() === 'right' ? 'down' : 'right';
    const hasOther = other === 'down' ? cell.down : cell.across;
    if (hasOther) this.dir.set(other);
    this.setCurrent(r, c, false);
  }

  // klik w kratkę z pytaniem → skok do tej odpowiedzi (cyklicznie, gdy 2 pytania)
  onClueClick(cell: Cell): void {
    if (!cell.clues.length) return;
    const k = this.key(cell.row, cell.col);
    let idx = 0;
    if (cell.clues.length > 1 && this.lastClueKey === k) idx = 1 - this.lastClueIdx;
    this.lastClueKey = k;
    this.lastClueIdx = idx;
    const clue = cell.clues[idx];
    const entry = this.entries.find(
      (e) => e.clueAt[0] === cell.row && e.clueAt[1] === cell.col && e.dir === clue.dir,
    );
    if (entry && entry.cells.length) {
      this.dir.set(entry.dir);
      const first = entry.cells.find((cl) => !this.val(cl.row, cl.col)) ?? entry.cells[0];
      this.setCurrent(first.row, first.col, true);
    }
  }

  private moveNext(): void {
    const e = this.activeEntry();
    const cur = this.current();
    if (!e || !cur) return;
    const i = e.cells.findIndex((c) => c.row === cur.row && c.col === cur.col);
    if (i >= 0 && i + 1 < e.cells.length) {
      const n = e.cells[i + 1];
      this.setCurrent(n.row, n.col, true);
    }
  }
  private movePrev(): void {
    const e = this.activeEntry();
    const cur = this.current();
    if (!e || !cur) return;
    const i = e.cells.findIndex((c) => c.row === cur.row && c.col === cur.col);
    if (i > 0) {
      const p = e.cells[i - 1];
      this.setVal(p.row, p.col, '');
      this.clearWrong(p.row, p.col);
      this.save();
      this.setCurrent(p.row, p.col, true);
    }
  }
  private step(r: number, c: number, dr: number, dc: number): void {
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < this.board.rows && nc >= 0 && nc < this.board.cols) {
      const cell = this.cellAt(nr, nc);
      if (cell && cell.kind === 'letter') {
        this.setCurrent(nr, nc, true);
        return;
      }
      nr += dr;
      nc += dc;
    }
  }

  // ---------- wpisywanie ----------
  onInput(ev: Event, r: number, c: number): void {
    const input = ev.target as HTMLInputElement;
    let ch = (input.value || '').toUpperCase().slice(-1);
    if (ch && !LETTER_RE.test(ch)) ch = '';
    input.value = ch;
    this.setVal(r, c, ch);
    this.clearWrong(r, c);
    this.save();
    if (ch) this.moveNext();
    this.autoCheck();
  }

  onKeydown(ev: KeyboardEvent, r: number, c: number): void {
    const input = ev.target as HTMLInputElement;
    switch (ev.key) {
      case 'Backspace':
        if (!input.value) {
          ev.preventDefault();
          this.movePrev();
        }
        break;
      case 'ArrowRight': ev.preventDefault(); this.dir.set('right'); this.step(r, c, 0, 1); break;
      case 'ArrowLeft':  ev.preventDefault(); this.dir.set('right'); this.step(r, c, 0, -1); break;
      case 'ArrowDown':  ev.preventDefault(); this.dir.set('down');  this.step(r, c, 1, 0); break;
      case 'ArrowUp':    ev.preventDefault(); this.dir.set('down');  this.step(r, c, -1, 0); break;
      case ' ':
      case 'Enter': ev.preventDefault(); this.toggleDir(r, c); break;
    }
  }

  private setVal(r: number, c: number, ch: string): void {
    const next = { ...this.inputs() };
    if (ch) next[this.key(r, c)] = ch;
    else delete next[this.key(r, c)];
    this.inputs.set(next);
  }
  private clearWrong(r: number, c: number): void {
    if (!this.wrong().size) return;
    const next = new Set(this.wrong());
    next.delete(this.key(r, c));
    this.wrong.set(next);
  }

  // ---------- zapis / odczyt ----------
  private save(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.inputs()));
  }
  private load(): void {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}') as Record<string, string>;
      this.inputs.set(data);
    } catch {
      this.inputs.set({});
    }
  }

  // ---------- sprawdzanie ----------
  private scan(): { total: number; filled: number; wrong: Set<string> } {
    const wrong = new Set<string>();
    let total = 0;
    let filled = 0;
    for (const row of this.grid) {
      for (const cell of row) {
        if (!cell || cell.kind !== 'letter') continue;
        total++;
        const v = this.val(cell.row, cell.col);
        if (!v) continue;
        filled++;
        if (v !== cell.answer) wrong.add(this.key(cell.row, cell.col));
      }
    }
    return { total, filled, wrong };
  }

  private autoCheck(): void {
    const { total, filled, wrong } = this.scan();
    if (filled === total && wrong.size === 0) this.solved.set(true);
  }

  check(): void {
    const { total, filled, wrong } = this.scan();
    this.wrong.set(wrong);
    if (filled === total && wrong.size === 0) {
      this.solved.set(true);
    } else if (filled < total) {
      this.flash('Jeszcze nie wszystko wypełnione');
    } else {
      this.flash(`Coś się nie zgadza (${wrong.size})`);
    }
  }

  clear(): void {
    if (!confirm('Wyczyścić całą planszę?')) return;
    this.inputs.set({});
    this.wrong.set(new Set());
    localStorage.removeItem(this.storageKey);
  }

  closeSuccess(): void {
    this.solved.set(false);
  }

  private flash(msg: string): void {
    this.message.set(msg);
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.message.set(''), 2500);
  }

  // ---------- zoom (pan = natywne przewijanie viewportu) ----------
  zoomIn(): void {
    this.zoom.set(Math.min(MAX_ZOOM, this.zoom() + ZOOM_STEP));
  }
  zoomOut(): void {
    this.zoom.set(Math.max(MIN_ZOOM, this.zoom() - ZOOM_STEP));
  }
  @HostListener('window:resize')
  fit(): void {
    const vp = this.viewportEl()?.nativeElement;
    if (!vp) return;
    const cellPx = 47;
    const natural = this.board.cols * cellPx;
    const avail = vp.clientWidth - 36;
    this.zoom.set(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, avail / natural)));
  }
}
