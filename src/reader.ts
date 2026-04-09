// ─── Shared terminal reader ─────────────────────────────────
// A generic pager for markdown content. Used by /read and /read-review.

import chalk from 'chalk';
import wrapAnsi from 'wrap-ansi';

const CONTENT_WIDTH = 72;

export interface ReaderPage {
  title: string;
  content: string;
}

function renderPage(
  lines: string[],
  scrollOffset: number,
  viewHeight: number,
  title: string,
  pageIndex: number,
  totalPages: number,
  hasPrevNext: boolean,
): void {
  process.stdout.write('\x1B[2J\x1B[H');

  // Top bar
  const label = totalPages > 1 ? ` ${title} (${pageIndex + 1}/${totalPages}) ` : ` ${title} `;
  const padded = label.padStart(
    Math.floor((CONTENT_WIDTH + label.length) / 2)
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
    ? chalk.dim(` ${pct}% (${scrollOffset + 1}-${Math.min(scrollOffset + viewHeight, totalLines)}/${totalLines})`)
    : '';

  // Bottom bar
  console.log();
  const nav = hasPrevNext
    ? chalk.cyan('N') + chalk.dim(' next  ') + chalk.cyan('P') + chalk.dim(' prev  ')
    : '';
  console.log(
    chalk.dim('  ↑/↓ scroll  ') + nav + chalk.cyan('Q') + chalk.dim(' quit') + scrollInfo
  );
}

export function formatMarkdown(raw: string): string[] {
  const lines: string[] = [];
  const paragraphs = raw.split(/\n/);

  for (const para of paragraphs) {
    const trimmed = para;
    if (trimmed.startsWith('# ')) {
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
      lines.push(chalk.dim('· · · · · · ·'));
      lines.push('');
    } else if (trimmed.startsWith('> ')) {
      const wrapped = wrapAnsi(trimmed.replace(/^> /, ''), CONTENT_WIDTH - 4, { hard: true });
      for (const wl of wrapped.split('\n')) {
        lines.push(chalk.dim('│ ') + chalk.italic(wl));
      }
    } else if (trimmed.startsWith('- ')) {
      const wrapped = wrapAnsi(trimmed.replace(/^- /, ''), CONTENT_WIDTH - 2, { hard: true });
      const wls = wrapped.split('\n');
      lines.push('• ' + wls[0]);
      for (let i = 1; i < wls.length; i++) {
        lines.push('  ' + wls[i]);
      }
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      lines.push(chalk.bold(trimmed.replace(/\*\*/g, '')));
    } else if (trimmed === '') {
      lines.push('');
    } else {
      const wrapped = wrapAnsi(trimmed, CONTENT_WIDTH, { hard: true });
      for (const wl of wrapped.split('\n')) {
        lines.push(wl);
      }
    }
  }

  return lines;
}

export async function startReader(pages: ReaderPage[]): Promise<void> {
  if (pages.length === 0) return;

  let currentPage = 0;
  let scrollOffset = 0;
  let lines: string[] = [];

  const loadPage = (index: number): void => {
    lines = formatMarkdown(pages[index].content);
    scrollOffset = 0;
  };

  loadPage(0);
  const hasPrevNext = pages.length > 1;

  return new Promise<void>((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    const getViewHeight = () => Math.max(5, (process.stdout.rows || 24) - 5);

    const draw = () => {
      renderPage(lines, scrollOffset, getViewHeight(), pages[currentPage].title, currentPage, pages.length, hasPrevNext);
    };

    draw();

    const onResize = () => draw();
    process.stdout.on('resize', onResize);

    const onKeypress = async (data: Buffer) => {
      const key = data.toString();
      const viewHeight = getViewHeight();
      const maxScroll = Math.max(0, lines.length - viewHeight);

      if (key === 'q' || key === 'Q' || (key === '\x1B' && data.length === 1)) {
        cleanup();
        return;
      }

      if (key === '\x03') {
        cleanup();
        return;
      }

      if (key === '\x1B[A' || key === 'k') {
        scrollOffset = Math.max(0, scrollOffset - 1);
        draw();
        return;
      }

      if (key === '\x1B[B' || key === 'j') {
        scrollOffset = Math.min(maxScroll, scrollOffset + 1);
        draw();
        return;
      }

      if (key === '\x1B[5~' || key === 'u') {
        scrollOffset = Math.max(0, scrollOffset - viewHeight);
        draw();
        return;
      }

      if (key === '\x1B[6~' || key === 'd' || key === ' ') {
        scrollOffset = Math.min(maxScroll, scrollOffset + viewHeight);
        draw();
        return;
      }

      if (key === '\x1B[H' || key === 'g') {
        scrollOffset = 0;
        draw();
        return;
      }

      if (key === '\x1B[F' || key === 'G') {
        scrollOffset = maxScroll;
        draw();
        return;
      }

      if (hasPrevNext && (key === 'n' || key === 'N')) {
        if (currentPage < pages.length - 1) {
          currentPage++;
          loadPage(currentPage);
          draw();
        }
        return;
      }

      if (hasPrevNext && (key === 'p' || key === 'P')) {
        if (currentPage > 0) {
          currentPage--;
          loadPage(currentPage);
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
      process.stdout.write('\x1B[2J\x1B[H');
      resolve();
    };
  });
}
