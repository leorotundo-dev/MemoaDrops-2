export function initSentry() {
  // placeholder para @sentry/node caso deseje usar
  if (process.env.SENTRY_DSN) {
    console.log('[sentry] initialized');
  }
}
