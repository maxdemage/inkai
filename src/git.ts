import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

let gitAvailable = false;

export async function checkGit(): Promise<boolean> {
  try {
    await execFileAsync('git', ['--version']);
    gitAvailable = true;
    return true;
  } catch {
    gitAvailable = false;
    return false;
  }
}

export function isGitAvailable(): boolean {
  return gitAvailable;
}

export async function gitInit(cwd: string): Promise<void> {
  if (!gitAvailable) return;
  try {
    await execFileAsync('git', ['init'], { cwd });
  } catch {
    // silently fail
  }
}

export async function gitAdd(cwd: string, files: string = '.'): Promise<void> {
  if (!gitAvailable) return;
  try {
    await execFileAsync('git', ['add', files], { cwd });
  } catch {
    // silently fail
  }
}

export async function gitCommit(cwd: string, message: string): Promise<void> {
  if (!gitAvailable) return;
  try {
    await execFileAsync('git', ['add', '.'], { cwd });
    await execFileAsync('git', ['commit', '-m', message], { cwd });
  } catch {
    // silently fail – could be nothing to commit
  }
}

export interface GitStatusResult {
  available: boolean;
  /** Short-format lines from `git status --short` */
  changed: string[];
  /** Log entries from `git log` */
  log: Array<{ hash: string; date: string; message: string }>;
}

export async function gitStatus(cwd: string): Promise<GitStatusResult> {
  if (!gitAvailable) return { available: false, changed: [], log: [] };
  try {
    const [statusOut, logOut] = await Promise.all([
      execFileAsync('git', ['status', '--short'], { cwd }).catch(() => ({ stdout: '' })),
      execFileAsync('git', ['log', '--pretty=format:%h\x1f%ci\x1f%s', '--max-count=30'], { cwd }).catch(() => ({ stdout: '' })),
    ]);
    const changed = (statusOut.stdout as string).split('\n').filter(Boolean);
    const log = (logOut.stdout as string)
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [hash, date, ...msgParts] = line.split('\x1f');
        return { hash: hash ?? '', date: date ?? '', message: msgParts.join('\x1f') };
      });
    return { available: true, changed, log };
  } catch {
    return { available: true, changed: [], log: [] };
  }
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  if (!gitAvailable) return false;
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return true;
  } catch {
    return false;
  }
}
