/**
 * A small RFC 4180 CSV reader.
 *
 * Hand-rolled rather than adding a dependency for one import, but only because
 * it is unit-tested against the real Todoist export — which exercises the parts
 * people usually get wrong: quoted fields containing commas, embedded newlines
 * (the firewood and mozzarella instructions run to a dozen lines), doubled
 * quotes, and a UTF-8 BOM on the header row.
 */

export type CsvRow = Record<string, string>

export function parseCsv(input: string): CsvRow[] {
  const rows = parseRows(input)
  if (rows.length === 0) return []

  const header = rows[0].map((cell, index) => (index === 0 ? stripBom(cell) : cell).trim())

  return rows.slice(1).map((cells) => {
    const row: CsvRow = {}
    header.forEach((key, index) => {
      row[key] = cells[index] ?? ''
    })
    return row
  })
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value
}

/** Splits into rows of raw cells, honouring quotes. */
export function parseRows(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  // Normalise line endings so an embedded CRLF inside a quoted field does not
  // produce a stray carriage return in the value.
  const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += char
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = true
      i += 1
      continue
    }

    if (char === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }

    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += 1
      continue
    }

    field += char
    i += 1
  }

  // A final field with no trailing newline still counts.
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}
