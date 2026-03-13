'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error('Global app error', {
    message: error?.message,
    digest: error?.digest,
    stack: error?.stack,
  })

  return (
    <html lang="no">
      <body className="bg-white text-neutral-900">
        <div className="min-h-screen w-full flex items-center justify-center px-4">
          <div className="max-w-xl w-full rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-3">Uventet feil</h1>
            <p className="text-sm text-neutral-600 mb-6">
              Vi klarte ikke laste siden akkurat nå. Prøv igjen om et øyeblikk.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-xl bg-neutral-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-neutral-800"
              >
                Prøv igjen
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300 text-neutral-900 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50"
              >
                Gå til forsiden
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}

