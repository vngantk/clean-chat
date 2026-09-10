/**
 * Read `{ error }` from a failed HTTP response, or `HTTP {status}` when
 * the body is not that shape.
 */
export async function readHttpErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string" &&
      body.error.length > 0
    ) {
      return body.error;
    }
  } catch {
    // Non-JSON error body.
  }
  return `HTTP ${String(response.status)}`;
}
