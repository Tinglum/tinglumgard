$files = @('content/copy.en.ts','content/copy.no.ts')
$map = @(
  @{From = "$([char]0x00C3)$([char]0x00A5)"; To = "$([char]0x00E5)"},
  @{From = "$([char]0x00C3)$([char]0x00B8)"; To = "$([char]0x00F8)"},
  @{From = "$([char]0x00C3)$([char]0x00A6)"; To = "$([char]0x00E6)"},
  @{From = "$([char]0x00C3)$([char]0x0085)"; To = "$([char]0x00C5)"},
  @{From = "$([char]0x00C3)$([char]0x0098)"; To = "$([char]0x00D8)"},
  @{From = "$([char]0x00C3)$([char]0x0086)"; To = "$([char]0x00C6)"},
  @{From = "$([char]0x00C3)$([char]0x00A9)"; To = "$([char]0x00E9)"},
  @{From = "$([char]0x00C3)$([char]0x00B4)"; To = "$([char]0x00F4)"},
  @{From = "$([char]0x00C3)$([char]0x00BC)"; To = "$([char]0x00FC)"},
  @{From = "$([char]0x00C3)$([char]0x00B6)"; To = "$([char]0x00F6)"},
  @{From = "$([char]0x00C3)$([char]0x00AB)"; To = "$([char]0x00EB)"},
  @{From = "$([char]0x00C3)$([char]0x0096)"; To = "$([char]0x00D6)"},
  @{From = "$([char]0x00C3)$([char]0x0089)"; To = "$([char]0x00C9)"},
  @{From = "$([char]0x00E2)$([char]0x0080)$([char]0x00A2)"; To = "$([char]0x2022)"},
  @{From = "$([char]0x00C2)$([char]0x00B7)"; To = "$([char]0x00B7)"},
  @{From = "$([char]0x00C2)$([char]0x00A7)"; To = "$([char]0x00A7)"},
  @{From = "$([char]0x00E2)$([char]0x0080)$([char]0x0093)"; To = "$([char]0x2013)"},
  @{From = "$([char]0x00E2)$([char]0x0080)$([char]0x0094)"; To = "$([char]0x2014)"},
  @{From = "$([char]0x00E2)$([char]0x0080)$([char]0x009C)"; To = "$([char]0x201C)"},
  @{From = "$([char]0x00E2)$([char]0x0080)$([char]0x009D)"; To = "$([char]0x201D)"},
  @{From = "$([char]0x00E2)$([char]0x0080)$([char]0x0098)"; To = "$([char]0x2018)"},
  @{From = "$([char]0x00E2)$([char]0x0080)$([char]0x0099)"; To = "$([char]0x2019)"},
  @{From = "$([char]0x00C2)$([char]0x00B0)"; To = "$([char]0x00B0)"},
  @{From = "$([char]0x00C2)$([char]0x00A0)"; To = " "})

foreach ($file in $files) {
  $path = Join-Path $PWD $file
  $content = Get-Content -Raw -Encoding UTF8 $path
  foreach ($pair in $map) {
    $content = $content.Replace($pair.From, $pair.To)
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}
