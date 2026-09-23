const INTERNAL_ERROR =
  /\b(PGRST|postgres|sqlstate|violates|constraint|relation|schema cache|syntax error|permission denied|row-level security|duplicate key|plpgsql|does not exist|has no field|stack trace|traceback)\b|\bfunction\s+[\w".]|\bcolumn\s+"|\bat\s+.+\(.+:\d+:\d+\)|\n\s*at\s+/i

function readErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return ''
}

/** User-facing copy only. Database context, function names, and stack traces stay out of the UI. */
export function publicErrorMessage(error: unknown, fallback: string): string {
  const message = readErrorMessage(error).trim()
  if (!message || message.length > 200 || message.includes('\n') || INTERNAL_ERROR.test(message)) {
    return fallback
  }
  return message
}
