import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import type { Command } from '../types.js';
import { info, success, warn, blank } from '../ui.js';
import { startServer } from '../server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const serveCommand: Command = {
  name: 'serve',
  description: 'Start the inkai web UI on localhost:4242',
  aliases: ['web', 'ui'],

  async execute(_args, _ctx) {
    const webDistPath = join(__dirname, '..', '..', 'web', 'dist');

    blank();
    info('Starting inkai web server...');

    if (!existsSync(webDistPath)) {
      warn('Web UI not built yet. Run: cd web && npm run build');
      warn('Server will start in API-only mode.');
    } else {
      success('Web UI found — serving from web/dist');
    }

    blank();
    await startServer(existsSync(webDistPath) ? webDistPath : undefined);
  },
};
