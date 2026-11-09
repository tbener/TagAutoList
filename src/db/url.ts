/**
 * pg currently treats sslmode=prefer|require|verify-ca as verify-full and warns
 * that this will change. Saying verify-full explicitly keeps today's behaviour
 * and silences the warning, whatever the connection string in the env says.
 */
export function dbUrl(raw: string | undefined): string | undefined {
  return raw?.replace(/([?&]sslmode=)(prefer|require|verify-ca)\b/, "$1verify-full");
}
