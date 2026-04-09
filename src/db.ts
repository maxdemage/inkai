import { join } from 'node:path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import type { Database, BookRecord } from './types.js';
import { getInkaiDir, ensureInkaiDir } from './config.js';

let db: Low<Database>;

export async function initDB(): Promise<void> {
  await ensureInkaiDir();
  const dbPath = join(getInkaiDir(), 'db.json');
  const adapter = new JSONFile<Database>(dbPath);
  const defaultData: Database = { books: [] };
  db = new Low(adapter, defaultData);
  await db.read();
}

export function getDB(): Low<Database> {
  return db;
}

export async function getAllBooks(): Promise<BookRecord[]> {
  await db.read();
  return db.data.books;
}

export async function getBookByName(projectName: string): Promise<BookRecord | undefined> {
  await db.read();
  return db.data.books.find(b => b.projectName === projectName);
}

export async function getBookById(id: string): Promise<BookRecord | undefined> {
  await db.read();
  return db.data.books.find(b => b.id === id);
}

export async function addBook(book: BookRecord): Promise<void> {
  db.data.books.push(book);
  await db.write();
}

export async function updateBook(id: string, updates: Partial<BookRecord>): Promise<void> {
  const idx = db.data.books.findIndex(b => b.id === id);
  if (idx !== -1) {
    db.data.books[idx] = { ...db.data.books[idx], ...updates, updatedAt: new Date().toISOString() };
    await db.write();
  }
}

export async function removeBook(id: string): Promise<void> {
  db.data.books = db.data.books.filter(b => b.id !== id);
  await db.write();
}
