import { Component, HostListener, inject, signal } from '@angular/core';
import { AuthService } from '../auth';

@Component({ selector: 'app-gate', templateUrl: './gate.html', styleUrl: './gate.scss' })
export class Gate {
  private readonly auth = inject(AuthService);
  readonly pin = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  readonly digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  readonly letters = ['', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];

  async press(digit: string): Promise<void> {
    if (this.busy() || this.pin().length >= 4) return;
    this.error.set('');
    this.pin.update(value => value + digit);
    if (this.pin().length !== 4) return;
    this.busy.set(true);
    try {
      if (!(await this.auth.verify(this.pin()))) {
        this.error.set('To nie ten kod. Spróbuj jeszcze raz.');
        this.pin.set('');
      }
    } catch {
      this.error.set('Nie udało się sprawdzić kodu. Spróbuj ponownie.');
      this.pin.set('');
    } finally {
      this.busy.set(false);
    }
  }
  erase(): void {
    if (!this.busy()) {
      this.pin.update(value => value.slice(0, -1));
      this.error.set('');
    }
  }
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      void this.press(event.key);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      this.erase();
    }
  }
}
