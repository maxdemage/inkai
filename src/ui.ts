import chalk from 'chalk';
import boxen from 'boxen';
import figlet from 'figlet';

// ─── Color Palette ────────────────────────────────────────────

export const c = {
  primary:   chalk.cyan,
  accent:    chalk.magenta,
  success:   chalk.green,
  warning:   chalk.yellow,
  error:     chalk.red,
  muted:     chalk.gray,
  bold:      chalk.bold,
  dim:       chalk.dim,
  highlight: chalk.bold.cyan,
  label:     chalk.bold.white,
  value:     chalk.white,
};

// ─── Banner ───────────────────────────────────────────────────

export function showBanner(): void {
  const ascii = figlet.textSync('inkai', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
  });

  const quotes = [
    '~ "let me ink that for you"',
    '~ "worlds await!"',
    '~ "plot twist incoming..."',
    '~ "once upon a time..."',
  ];

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  const banner = boxen(
    c.primary(ascii) + '\n' +
    c.muted('      🐙 AI-Powered Book Writing Agent') + '\n' +
    c.muted('                    v0.3.0') + '\n\n' +
    `    ${c.muted(quote)}`,
    {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 2, right: 2 },
      borderStyle: 'double',
      borderColor: 'cyan',
    }
  );

  console.log(banner);
}

// ─── Section Headers ──────────────────────────────────────────

export function header(text: string): void {
  console.log('\n' + c.highlight(`━━━ ${text} ━━━`) + '\n');
}

export function subheader(text: string): void {
  console.log(c.accent(`  ▸ ${text}`));
}

// ─── Status Messages ──────────────────────────────────────────

export function info(text: string): void {
  console.log(c.primary('  ℹ  ') + text);
}

export function success(text: string): void {
  console.log(c.success('  ✔  ') + text);
}

export function warn(text: string): void {
  console.log(c.warning('  ⚠  ') + text);
}

export function error(text: string): void {
  console.log(c.error('  ✖  ') + text);
}

// ─── Formatted Output ─────────────────────────────────────────

export function keyValue(key: string, value: string): void {
  console.log(c.muted('  ') + c.label(key.padEnd(16)) + c.value(value));
}

export function divider(): void {
  console.log(c.muted('  ' + '─'.repeat(50)));
}

export function blank(): void {
  console.log();
}

// ─── Status Badge ─────────────────────────────────────────────

export function statusBadge(status: string): string {
  switch (status) {
    case 'new':                return chalk.bgBlue.white(` NEW `);
    case 'initial-processing': return chalk.bgYellow.black(` PROCESSING `);
    case 'work-in-progress':   return chalk.bgGreen.black(` IN PROGRESS `);
    case 'completed':          return chalk.bgMagenta.white(` COMPLETED `);
    case 'archived':           return chalk.bgRed.white(` ARCHIVED `);
    default:                   return chalk.bgGray.white(` ${status.toUpperCase()} `);
  }
}

// ─── Box Message ──────────────────────────────────────────────

export function boxMessage(text: string, title?: string): void {
  console.log(boxen(text, {
    padding: 1,
    margin: { top: 0, bottom: 0, left: 2, right: 2 },
    borderStyle: 'round',
    borderColor: 'cyan',
    title: title,
    titleAlignment: 'left',
  }));
}

// ─── Prompt Prefix ────────────────────────────────────────────

export function getPrompt(bookName?: string): string {
  const base = c.primary('🐙 inkai');
  if (bookName) {
    return `${base} ${c.accent(`[${bookName}]`)} ${c.muted('❯')} `;
  }
  return `${base} ${c.muted('❯')} `;
}

// ─── Progress Display ─────────────────────────────────────────

export function progressStep(current: number, total: number, text: string): void {
  const bar = c.primary('█'.repeat(current) + c.muted('░'.repeat(total - current)));
  console.log(`  ${bar} ${c.muted(`[${current}/${total}]`)} ${text}`);
}
