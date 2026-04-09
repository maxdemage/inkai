// ─── Safe JSON parsing for LLM responses ─────────────────────
// LLMs occasionally return malformed JSON even with jsonMode.
// This helper tries multiple extraction strategies before failing
// with a descriptive error.

export class LLMParseError extends Error {
  public readonly rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = 'LLMParseError';
    this.rawResponse = rawResponse;
  }
}

/**
 * Parse a JSON response from an LLM. Tries:
 *   1. Direct JSON.parse
 *   2. Extract from ```json code fences
 *   3. Find first { or [ and parse from there
 * Throws LLMParseError with context on failure.
 */
export function parseLLMJson<T = unknown>(response: string, context?: string): T {
  const trimmed = response.trim();

  // 1. Direct parse
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue
  }

  // 2. Extract from markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // continue
    }
  }

  // 3. Find first { or [ and extract to matching close
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  let startIdx = -1;

  if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket >= 0) {
    startIdx = firstBracket;
  }

  if (startIdx >= 0) {
    const substr = trimmed.slice(startIdx);
    try {
      return JSON.parse(substr) as T;
    } catch {
      // Last attempt: find the matching closing brace/bracket
      const openChar = substr[0];
      const closeChar = openChar === '{' ? '}' : ']';
      const lastClose = substr.lastIndexOf(closeChar);
      if (lastClose > 0) {
        try {
          return JSON.parse(substr.slice(0, lastClose + 1)) as T;
        } catch {
          // fall through to error
        }
      }
    }
  }

  const preview = trimmed.length > 200 ? trimmed.slice(0, 200) + '…' : trimmed;
  const ctx = context ? ` (${context})` : '';
  throw new LLMParseError(
    `Failed to parse JSON from LLM response${ctx}. Preview: ${preview}`,
    trimmed,
  );
}
