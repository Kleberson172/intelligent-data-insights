Set-Location "$PSScriptRoot\artifacts\api-server"
Get-Content .env | ForEach-Object {
  if ($_ -match "^\s*([^#][^=]*)=(.*)$") {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
  }
}
Write-Host "Compilando backend..." -ForegroundColor Yellow
pnpm run build
Write-Host "Iniciando backend..." -ForegroundColor Cyan
pnpm run start
