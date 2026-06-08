param([int]$Port = 3000)

$root = Split-Path -Parent $PSScriptRoot

$mime = @{
  '.html'=  'text/html; charset=utf-8'
  '.css'=   'text/css; charset=utf-8'
  '.js'=    'application/javascript; charset=utf-8'
  '.mjs'=   'application/javascript; charset=utf-8'
  '.json'=  'application/json; charset=utf-8'
  '.jsonl'= 'application/json; charset=utf-8'
  '.png'=   'image/png'
  '.jpg'=   'image/jpeg'
  '.jpeg'=  'image/jpeg'
  '.gif'=   'image/gif'
  '.webp'=  'image/webp'
  '.svg'=   'image/svg+xml'
  '.ico'=   'image/x-icon'
  '.pdf'=   'application/pdf'
  '.woff'=  'font/woff'
  '.woff2'= 'font/woff2'
  '.ttf'=   'font/ttf'
  '.mp4'=   'video/mp4'
  '.txt'=   'text/plain; charset=utf-8'
}

$noCacheExts = @('.html','.js','.mjs','.json','.jsonl','.css')

function ts { return (Get-Date -Format 'HH:mm:ss') }

$crashCount = 0

while ($true) {
  $listener = $null
  try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Prefixes.Add("http://127.0.0.1:$Port/")
    $listener.Start()
    $crashCount = 0

    Write-Host "$(ts) [OK] Server started: http://localhost:$Port/webapp/" -ForegroundColor Green
    Write-Host "      Root: $root" -ForegroundColor Gray
    Write-Host "      Press Ctrl+C to stop." -ForegroundColor DarkGray

    while ($listener.IsListening) {
      $async = $listener.BeginGetContext($null, $null)
      if (-not $async.AsyncWaitHandle.WaitOne(1000)) { continue }

      $ctx = $null
      try { $ctx = $listener.EndGetContext($async) }
      catch { continue }

      $req = $ctx.Request
      $res = $ctx.Response

      try {
        $res.Headers.Add("Access-Control-Allow-Origin", "*")
        $res.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS")
        $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        if ($req.HttpMethod -eq 'OPTIONS') {
          $res.StatusCode = 204
          $res.Close()
          continue
        }

        $rawPath = $req.Url.LocalPath
        $path = $rawPath.Split('?')[0]

        if ($path -eq '/') {
          $res.StatusCode = 302
          $res.Headers.Add("Location", "/webapp/")
          $res.Close()
          continue
        }
        if ($path -eq '/webapp' -or $path -eq '/webapp/') {
          $path = '/webapp/index.html'
        }

        $decoded = [System.Uri]::UnescapeDataString($path.TrimStart('/'))
        $filePath = Join-Path $root $decoded

        if (Test-Path $filePath -PathType Leaf) {
          $ext = ([System.IO.Path]::GetExtension($filePath)).ToLower()
          $ct = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }
          $res.ContentType = $ct
          if ($noCacheExts -contains $ext) {
            $res.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
            $res.Headers.Add("Pragma", "no-cache")
            $res.Headers.Add("Expires", "0")
          } else {
            $res.Headers.Add("Cache-Control", "public, max-age=86400")
          }
          $bytes = [System.IO.File]::ReadAllBytes($filePath)
          $res.ContentLength64 = $bytes.Length
          $res.OutputStream.Write($bytes, 0, $bytes.Length)
          $res.StatusCode = 200
        } else {
          $res.StatusCode = 404
          $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $decoded")
          $res.ContentLength64 = $body.Length
          $res.ContentType = 'text/plain; charset=utf-8'
          $res.OutputStream.Write($body, 0, $body.Length)
          Write-Host "$(ts) [404] $path" -ForegroundColor DarkYellow
        }
      } catch {
        Write-Host "$(ts) [ERR] Request failed: $_" -ForegroundColor Yellow
        try { $res.StatusCode = 500 } catch {}
      } finally {
        try { $res.OutputStream.Close() } catch {}
      }
    }

  } catch {
    $crashCount++
    Write-Host "$(ts) [ERR] Listener error #$crashCount : $_" -ForegroundColor Red
    if ($_.Exception.Message -match 'Access is denied') {
      Write-Host "      Port $Port may be in use. Retrying in 10s..." -ForegroundColor Red
      Start-Sleep -Seconds 10
    } else {
      Start-Sleep -Seconds 3
    }
  } finally {
    if ($null -ne $listener) {
      try { $listener.Stop()  } catch {}
      try { $listener.Close() } catch {}
    }
    if ($crashCount -gt 0) {
      Write-Host "$(ts) Restarting in 3s..." -ForegroundColor Yellow
      Start-Sleep -Seconds 3
    }
  }
}
