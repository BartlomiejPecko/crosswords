import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../auth';

@Component({
  selector: 'app-gate',
  templateUrl: './gate.html',
  styleUrl: './gate.scss',
})
export class Gate {
  private auth = inject(AuthService);
  readonly error = signal(false);

  async submit(event: Event, value: string): Promise<void> {
    event.preventDefault();
    const ok = await this.auth.verify(value);
    if (!ok) this.error.set(true);
  }
}
