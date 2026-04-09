import chalk from 'chalk';
import wrapAnsi from 'wrap-ansi';
import type { Command } from '../types.js';
import { getChapterCount, readChapter } from '../book/manager.js';
import { header, error, info, blank, c } from '../ui.js';

const CONTENT_WIDTH = 72;

function renderPage(
  lines: string[],
  scrollOffset: number,
  viewHeight: number,
  chapterNum: number,
  totalChapters: number
): void {
  // Clear screen
  process.stdout.write('\x1B[2J\x1B[H');

  // Top bar
  const titleBar = ` Chapter ${chapterNum} of ${totalChapters} `;
  const padded = titleBar.padStart(
    Math.floor((CONTENT_WIDTH + titleBar.length) / 2)
  ).padEnd(CONTENT_WIDTH);
  console.log(chalk.bgCyan.black(padded));
  console.log();

  // Content area
  const visibleLines = lines.slice(scrollOffset, scrollOffset + viewHeight);
  const leftPad = '    ';
  for (const line of visibleLines) {
    console.log(leftPad + line);
  }

  // Fill remaining space
  const remaining = viewHeight - visibleLines.length;
  for (let i = 0; i < remaining; i++) {
    console.log();
  }

  // Scroll indicator
  const totalLines = lines.length;
  const maxScroll = Math.max(0, totalLines - viewHeight);
  const pct = maxScroll > 0 ? Math.round((scrollOffset / maxScroll) * 100) : 100;
  const scrollInfo = totalLines > viewHeight
    ? c.muted(` ${pct}% (${scrollOffset + 1}-${Math.min(scrollOffset + viewHeight, totalLines)}/${totalLines})`)
    : '';

  // Bottom bar
  console.log();
  console.log(
    c.muted('  ↑/↓ scroll  ') +
    c.primary('N') + c.muted(' next  ') +
    c.primary('P') + c.muted(' prev  ') +
    c.primary('Q') + c.muted(' quit') +
    scrollInfo
  );
}

function formatChapterContent(raw: string): string[] {
  const lines: string[] = [];
  const paragraphs = raw.split(/\n/);

  for (const para of paragraphs) {
    const trimmed = para;
    if (trimmed.startsWith('# ')) {
      // Chapter title
      lines.push('');
      lines.push(chalk.bold.cyan(trimmed.replace(/^# /, '')));
      lines.push(chalk.cyan('─'.repeat(CONTENT_WIDTH)));
      lines.push('');
    } else if (trimmed.startsWith('## ')) {
      lines.push('');
      lines.push(chalk.bold.magenta(trimmed.replace(/^## /, '')));
      lines.push('');
    } else if (trimmed.startsWith('### ')) {
      lines.push('');
      lines.push(chalk.bold.white(trimmed.replace(/^### /, '')));
      lines.push('');
    } else if (trimmed.startsWith('---') || trimmed.startsWith('***')) {
      lines.push('');
      lines.push(c.muted('· · · · · · ·'));
      lines.push('');
    } else if (trimmed.startsWith('> ')) {
      const wrapped = wrapAnsi(trimmed.replace(/^> /, ''), CONTENT_WIDTH - 4, { hard: true });
      for (const wl of wrapped.split('\n')) {
        lines.push(c.muted('│ ') + chalk.italic(wl));
      }
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      lines.push(chalk.bold(trimmed.replace(/\*\*/g, '')));
    } else if (trimmed === '') {
      lines.push('');
    } else {
      // Regular paragraph - wrap to width
      const wrapped = wrapAnsi(trimmed, CONTENT_WIDTH, { hard: true });
      for (const wl of wrapped.split('\n')) {
        lines.push(wl);
      }
    }
  }

  return lines;
}

async function readMode(
  config: any,
  projectName: string,
  startChapter: number,
  totalChapters: number
): Promise<void> {
  let currentChapter = startChapter;
  let scrollOffset = 0;
  let lines: string[] = [];

  const loadChapter = async (num: number): Promise<boolean> => {
    const content = await readChapter(config, projectName, num);
    if (!content) return false;
    lines = formatChapterContent(content);
    scrollOffset = 0;
    return true;
  };

  await loadChapter(currentChapter);

  return new Promise<void>((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    const getViewHeight = () => Math.max(5, (process.stdout.rows || 24) - 5);

    const draw = () => {
      renderPage(lines, scrollOffset, getViewHeight(), currentChapter, totalChapters);
    };

    draw();

    const onResize = () => draw();
    process.stdout.on('resize', onResize);

    const onKeypress = async (data: Buffer) => {
      const key = data.toString();
      const viewHeight = getViewHeight();
      const maxScroll = Math.max(0, lines.length - viewHeight);

      // q / Q / Escape → quit
      if (key === 'q' || key === 'Q' || key === '\x1B' && data.length === 1) {
        cleanup();
        return;
      }

      // Ctrl+C
      if (key === '\x03') {
        cleanup();
        return;
      }

      // Arrow up / k
      if (key === '\x1B[A' || key === 'k') {
        scrollOffset = Math.max(0, scrollOffset - 1);
        draw();
        return;
      }

      // Arrow down / j
      if (key === '\x1B[B' || key === 'j') {
        scrollOffset = Math.min(maxScroll, scrollOffset + 1);
        draw();
        return;
      }

      // Page up / u
      if (key === '\x1B[5~' || key === 'u') {
        scrollOffset = Math.max(0, scrollOffset - viewHeight);
        draw();
        return;
      }

      // Page down / d / Space
      if (key === '\x1B[6~' || key === 'd' || key === ' ') {
        scrollOffset = Math.min(maxScroll, scrollOffset + viewHeight);
        draw();
        return;
      }

      // Home / g
      if (key === '\x1B[H' || key === 'g') {
        scrollOffset = 0;
        draw();
        return;
      }

      // End / G
      if (key === '\x1B[F' || key === 'G') {
        scrollOffset = maxScroll;
        draw();
        return;
      }

      // N → next chapter
      if (key === 'n' || key === 'N') {
        if (currentChapter < totalChapters) {
          currentChapter++;
          await loadChapter(currentChapter);
          draw();
        }
        return;
      }

      // P → previous chapter
      if (key === 'p' || key === 'P') {
        if (currentChapter > 1) {
          currentChapter--;
          await loadChapter(currentChapter);
          draw();
        }
        return;
      }
    };

    stdin.on('data', onKeypress);

    const cleanup = () => {
      stdin.removeListener('data', onKeypress);
      process.stdout.removeListener('resize', onResize);
      stdin.setRawMode(wasRaw ?? false);
      // Clear screen and restore
      process.stdout.write('\x1B[2J\x1B[H');
      resolve();
    };
  });
}

export const readCommand: Command = {
  name: 'read',
  description: 'Read book chapters in a comfortable CLI reader',
  aliases: ['reader', 'view'],
  requiresBook: true,

  async execute(args, ctx) {
    const book = ctx.selectedBook!;
    const totalChapters = await getChapterCount(ctx.config, book.projectName);

    if (totalChapters === 0) {
      error('No chapters written yet. Use /create-chapter to write one.');
      return;
    }

    let startChapter = 1;
    if (args[0]) {
      const n = parseInt(args[0], 10);
      if (isNaN(n) || n < 1 || n > totalChapters) {
        error(`Invalid chapter number. Available: 1-${totalChapters}`);
        return;
      }
      startChapter = n;
    }

    header(`Reading: ${book.title}`);
    info(`${totalChapters} chapter(s) available. Starting at chapter ${startChapter}.`);
    info('Entering reader mode...');
    blank();

    await readMode(ctx.config, book.projectName, startChapter, totalChapters);

    success(`Exited reader.`);
    blank();
  },
};

// Re-export for the success call
import { success } from '../ui.js';
