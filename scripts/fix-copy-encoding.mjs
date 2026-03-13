import fs from 'node:fs'
import path from 'node:path'

const files = ['content/copy.no.ts', 'content/copy.en.ts']

const MARKERS = ['Ã', 'Â', 'â€', 'â€“', 'â€”', 'â€¢', 'ï¿½', '�']

function looksCorrupted(value) {
  return MARKERS.some((marker) => value.includes(marker))
}

function score(value) {
  if (!value) return 0
  return MARKERS.reduce((sum, marker) => {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const matches = value.match(new RegExp(escaped, 'g'))
    return sum + (matches ? matches.length : 0)
  }, 0)
}

function decodeLatin1AsUtf8(value) {
  return Buffer.from(value, 'latin1').toString('utf8')
}

function fixMojibake(value) {
  if (!value || !looksCorrupted(value)) return value

  let current = value
  let currentScore = score(current)

  for (let i = 0; i < 3; i += 1) {
    const decoded = decodeLatin1AsUtf8(current)
    if (!decoded || decoded === current) break

    const decodedScore = score(decoded)
    const introducesReplacement = !current.includes('�') && decoded.includes('�')

    if (introducesReplacement || decodedScore >= currentScore) break

    current = decoded
    currentScore = decodedScore
    if (!looksCorrupted(current)) break
  }

  return current
}

function fixQuotedStrings(fileContent) {
  return fileContent.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (token) => {
    const quote = token[0]
    const body = token.slice(1, -1)
    const fixedBody = fixMojibake(body)
    return fixedBody === body ? token : `${quote}${fixedBody}${quote}`
  })
}

for (const relativeFile of files) {
  const filePath = path.resolve(relativeFile)
  const original = fs.readFileSync(filePath, 'utf8')
  const fixed = fixQuotedStrings(original)
  if (fixed !== original) {
    fs.writeFileSync(filePath, fixed, 'utf8')
    console.log(`fixed: ${relativeFile}`)
  } else {
    console.log(`unchanged: ${relativeFile}`)
  }
}

