Set-Location "$PSScriptRoot\artifacts\eleven-tech"
Get-Content .env | ForEach-Object {
  if ($_ -match "^\s*([^#][^=]*)=(.*)$") {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
  }
}
Write-Host "Iniciando frontend..." -ForegroundColor Cyan
pnpm run dev
