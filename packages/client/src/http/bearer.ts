/**
 * Parse `Authorization: Bearer <token>`. Returns `null` when missing or malformed.
 */
export function parseBearerAuthorization(
  header: string | null | undefined,
): string | null {
  if (header === undefined || header === null) {
    return null;
  }
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  const token = match?.[1];
  return token === undefined || token.length === 0 ? null : token;
}

export function bearerAuthorizationHeader(token: string): string {
  return `Bearer ${token}`;
}
