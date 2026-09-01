import '@testing-library/jest-dom/vitest'

/**
 * Unit tests must not depend on a real environment. Anything that needs the
 * live dev project belongs in tests/todotwo/rls, which loads .env.local
 * explicitly.
 */
process.env.TZ = 'UTC' // Netlify runs UTC; make the difference from Europe/Oslo visible.
