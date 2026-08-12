Set-Location "$PSScriptRoot\artifacts\api-server"
Get-Content .env | ForEach-Object {
  if ($_ -match "^\s*([^#][^=]*)=(.*)$") {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
  }
}
Write-Host "Iniciando backend..." -ForegroundColor Cyan
pnpm run start
