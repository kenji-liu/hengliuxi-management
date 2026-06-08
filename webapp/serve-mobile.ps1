$port = if ($env:PORT) { [int]$env:PORT } else { 8088 }
$root = $PSScriptRoot
$ip = (ipconfig | Select-String "IPv4" | Select-Object -First 1).ToString().Split(":")[-1].Trim()

Write-Host "Mobile inspection server"
Write-Host "Local:  http://localhost:$port/mobile-inspection.html"
if ($ip) {
  Write-Host "Phone:  http://$ip`:$port/mobile-inspection.html"
}
Write-Host "Keep this window open while using the phone form."

Set-Location $root
python -m http.server $port --bind 0.0.0.0
