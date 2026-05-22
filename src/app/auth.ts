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
  private readonly HASH = 'd97b0df52b50f024e60b92c3294bb98179276ef4a9740b599cb60f9834b49825'; // = "kasia123"
  private readonly KEY = 'kk_unlocked';

  readonly unlocked = signal(localStorage.getItem(this.KEY) === '1');

  async verify(input: string): Promise<boolean> {
    const ok = (await sha256(input)) === this.HASH;
    if (ok) {
      localStorage.setItem(this.KEY, '1');
      this.unlocked.set(true);
    }
    return ok;
  }
}
