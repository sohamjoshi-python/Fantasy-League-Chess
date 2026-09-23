export const GENERIC_ERROR = "Something went wrong. Please try again."

/** Write the real failure to server logs. Do not put this payload in a client response. */
export function logServerError(scope: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[${scope}] ${error.message}`)
    if (error.stack) console.error(error.stack)
    return
  }

  try {
    console.error(`[${scope}] ${JSON.stringify(error)}`)
  } catch {
    console.error(`[${scope}] ${String(error)}`)
  }
}
