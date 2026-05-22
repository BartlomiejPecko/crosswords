import { Component, inject } from '@angular/core';
import { AuthService } from './auth';
import { Gate } from './gate/gate';
import { Crossword } from './crossword/crossword';

@Component({
  selector: 'app-root',
  imports: [Gate, Crossword],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
}
