// Only same-origin paths: blocks open redirects like ?next=//evil.com, https://evil.com,
// /\evil.com, and control characters (browsers strip tabs/newlines, turning "/\t/x" into "//x").
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
