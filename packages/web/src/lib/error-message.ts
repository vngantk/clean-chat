/**
 * Human-readable message from a thrown value.
 */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message.length > 0
    ? err.message
    : fallback;
}
