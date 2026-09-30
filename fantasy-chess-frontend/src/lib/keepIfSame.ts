/** Return the existing state when the next value matches, so a refetch does not rerender. */
export function keepIfSame<T>(next: T) {
  return (current: T): T => (JSON.stringify(current) === JSON.stringify(next) ? current : next)
}
