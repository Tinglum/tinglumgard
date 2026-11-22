/**
 * Active deployment identifier used by both the layout and /api/todotwo/version
 * so installed PWAs and open browser tabs can detect a newer deploy and offer a
 * one-tap reload.
 */
export function getTodoTwoBuildVersion(): string {
  return (
    process.env.DEPLOY_ID ||
    process.env.COMMIT_REF ||
    process.env.NETLIFY_BUILD_ID ||
    'dev'
  )
}
