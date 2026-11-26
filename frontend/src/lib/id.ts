/** A random unique id. */
export function newId(): string {
  return crypto.randomUUID();
}
