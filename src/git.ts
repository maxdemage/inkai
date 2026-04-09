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

export async function isGitRepo(cwd: string): Promise<boolean> {
  if (!gitAvailable) return false;
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return true;
  } catch {
    return false;
  }
}
