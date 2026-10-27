import { serveStrategiFile } from '@/lib/bnimsp/strategi'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  return serveStrategiFile(request, 'html')
}
