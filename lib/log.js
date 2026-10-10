/**
 * Structured JSON logging. Callers must only pass non-personal fields
 * (reference, codes, counts). Never pass names, emails, phones or free text.
 */
const SAFE_KEYS = new Set(['event', 'reference', 'code', 'status', 'retryable', 'durationMs', 'attempt', 'httpStatus', 'channel']);

export function log(level, fields, sink = process.stdout) {
  const entry = { level, time: new Date().toISOString() };
  for (const [key, value] of Object.entries(fields)) {
    if (SAFE_KEYS.has(key)) entry[key] = value;
  }
  sink.write(`${JSON.stringify(entry)}\n`);
}
