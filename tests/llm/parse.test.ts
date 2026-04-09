import { describe, it, expect } from 'vitest';
import { parseLLMJson, LLMParseError } from '../../src/llm/parse.js';

describe('parseLLMJson', () => {
  // ─── Strategy 1: Direct JSON ────────────────────────────────

  it('parses valid JSON directly', () => {
    const result = parseLLMJson<{ ok: boolean }>(
      '{"ok": true}',
    );
    expect(result).toEqual({ ok: true });
  });

  it('parses a JSON array', () => {
    const result = parseLLMJson<number[]>('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('handles leading/trailing whitespace', () => {
    const result = parseLLMJson<{ x: number }>(
      '  \n {"x": 42} \n  ',
    );
    expect(result).toEqual({ x: 42 });
  });

  // ─── Strategy 2: Code fences ────────────────────────────────

  it('extracts JSON from ```json code fences', () => {
    const input = 'Here is the result:\n```json\n{"name": "test"}\n```\nDone.';
    expect(parseLLMJson(input)).toEqual({ name: 'test' });
  });

  it('extracts JSON from ``` code fences without language tag', () => {
    const input = '```\n{"a": 1}\n```';
    expect(parseLLMJson(input)).toEqual({ a: 1 });
  });

  // ─── Strategy 3: Find first brace/bracket ──────────────────

  it('finds JSON starting at first { when preceded by text', () => {
    const input = 'Sure! Here is your data: {"key": "value"}';
    expect(parseLLMJson(input)).toEqual({ key: 'value' });
  });

  it('finds JSON array starting at first [', () => {
    const input = 'Result: [{"id": 1}, {"id": 2}]';
    expect(parseLLMJson(input)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('handles trailing garbage after JSON object', () => {
    const input = '{"data": true} some trailing text';
    expect(parseLLMJson(input)).toEqual({ data: true });
  });

  // ─── Complex / nested structures ───────────────────────────

  it('parses deeply nested objects', () => {
    const obj = {
      changes_made: true,
      chapter: '# Chapter 1\n\nOnce upon a time...',
      issues_found: ['Fixed POV inconsistency', 'Corrected timeline'],
    };
    expect(parseLLMJson<typeof obj>(JSON.stringify(obj))).toEqual(obj);
  });

  it('parses the QA pipeline response format', () => {
    const qaResponse = JSON.stringify({
      changes_made: false,
      issues_found: [],
    });
    const result = parseLLMJson<{ changes_made: boolean; issues_found: string[] }>(qaResponse);
    expect(result.changes_made).toBe(false);
    expect(result.issues_found).toEqual([]);
  });

  // ─── Error cases ───────────────────────────────────────────

  it('throws LLMParseError for completely invalid input', () => {
    expect(() => parseLLMJson('not json at all')).toThrow(LLMParseError);
  });

  it('throws LLMParseError with context string', () => {
    try {
      parseLLMJson('bad', 'chapter QA');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(LLMParseError);
      expect((err as LLMParseError).message).toContain('chapter QA');
    }
  });

  it('includes raw response in LLMParseError', () => {
    try {
      parseLLMJson('{ broken json');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(LLMParseError);
      expect((err as LLMParseError).rawResponse).toBe('{ broken json');
    }
  });

  it('truncates long previews in error message', () => {
    const longStr = 'x'.repeat(300);
    try {
      parseLLMJson(longStr);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(LLMParseError);
      expect((err as LLMParseError).message).toContain('…');
    }
  });
});
