import * as readline from 'node:readline';
import { c } from './ui.js';

/**
 * Multiline CLI input. Enter adds a new line; pressing Enter on an
 * empty line submits the input.  A live hint is shown so the user
 * always knows how to finish.
 */
export function multilineInput(message: string): Promise<string> {
  return new Promise((resolve) => {
    console.log(c.primary('? ') + c.bold(message));
    console.log(c.muted('  (Enter = new line, press Enter on empty line to submit)'));
    console.log(c.muted('  ─────────────────────────────────────'));

    const lines: string[] = [];

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      prompt: c.muted('  │ '),
    });

    rl.prompt();

    rl.on('line', (line: string) => {
      if (line === '' && lines.length > 0) {
        // Empty line after content → submit
        rl.close();
        const result = lines.join('\n').trimEnd();
        console.log(c.muted('  ─────────────────────────────────────'));
        resolve(result);
        return;
      }

      // If truly first line and empty, just re-prompt (don't submit nothing)
      if (line === '' && lines.length === 0) {
        rl.prompt();
        return;
      }

      lines.push(line);
      rl.prompt();
    });

    rl.on('close', () => {
      // If closed via Ctrl+C/D, return what we have
      if (lines.length > 0) {
        resolve(lines.join('\n').trimEnd());
      } else {
        resolve('');
      }
    });
  });
}
