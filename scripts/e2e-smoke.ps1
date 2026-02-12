$ErrorActionPreference = "Stop"

$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev -- -p 4010" -PassThru

function Get-WebResult {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing
    return @{
      status = [int]$response.StatusCode
      content = $response.Content
    }
  } catch [System.Net.WebException] {
    $webResponse = $_.Exception.Response
    if ($null -ne $webResponse) {
      $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
      $body = $reader.ReadToEnd()
      return @{
        status = [int]$webResponse.StatusCode
        content = $body
      }
    }
    throw
  }
}

try {
  Start-Sleep -Seconds 25

  $checks = @()

  $produkt = Get-WebResult -Url "http://localhost:4010/produkt"
  $checks += "produkt_status=$($produkt.status)"
  $checks += "produkt_has_mangalitsa=$($produkt.content -match 'Mangalitsa')"

  $presetsResp = Get-WebResult -Url "http://localhost:4010/api/mangalitsa/presets"
  $checks += "presets_status=$($presetsResp.status)"
  if ($presetsResp.status -eq 200) {
    $presets = $presetsResp.content | ConvertFrom-Json
    $checks += "presets_count=$($presets.presets.Count)"
  }

  $bestill = Get-WebResult -Url "http://localhost:4010/bestill?preset=premium-cuts"
  $checks += "bestill_status=$($bestill.status)"

  $extrasResp = Get-WebResult -Url "http://localhost:4010/api/extras"
  $checks += "extras_status=$($extrasResp.status)"
  if ($extrasResp.status -eq 200) {
    $extras = $extrasResp.content | ConvertFrom-Json
    $firstExtra = $extras.extras | Select-Object -First 1
    if ($null -ne $firstExtra) {
      $checks += "extras_has_premium_field=$($null -ne $firstExtra.description_premium_no)"
    }
  }

  $checks | ForEach-Object { Write-Output $_ }
}
finally {
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
}
