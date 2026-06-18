// Directors whose login is granted BNIMSP editor rights (edit/publish/manage).
// This is scoped to /bnimsp only - it never grants farm-wide admin access.
// Add more via the BNIMSP_ADMIN_EMAILS env var (comma-separated).
const DEFAULT_ADMIN_EMAILS = ['kennethtinglum@bni.com']

export function isBnimspAdminEmail(email: string | null | undefined): boolean {
  const envList = (process.env.BNIMSP_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const set = new Set([...DEFAULT_ADMIN_EMAILS, ...envList])
  return set.has(String(email || '').trim().toLowerCase())
}
