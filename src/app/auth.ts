import { Injectable, signal } from '@angular/core';

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Bramka hasłem dla strony statycznej (GitHub Pages).
// W repo trzymamy WYŁĄCZNIE hash SHA-256 — czyste hasło nie jest nigdzie zapisane.
// To nie jest „prawdziwe" zabezpieczenie (kod jest publiczny), ale wystarcza na prezent.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly HASH = 'fb7bab9edf08f024aabf3501518399e82ab590666207a8b0ab7963b181ecf4b8';

  readonly unlocked = signal(false);

  lock(): void {
    this.unlocked.set(false);
  }

  async verify(input: string): Promise<boolean> {
    const ok = (await sha256(input)) === this.HASH;
    if (ok) {
      this.unlocked.set(true);
    }
    return ok;
  }
}
