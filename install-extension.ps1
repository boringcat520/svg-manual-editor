$ErrorActionPreference = "Stop"
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
$destRoot = Join-Path $env:USERPROFILE ".cursor\extensions"
$manifest = Get-Content (Join-Path $src "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$extensionId = "$($manifest.publisher).$($manifest.name)"
$dest = Join-Path $destRoot "$extensionId-$($manifest.version)"

New-Item -ItemType Directory -Force -Path $destRoot | Out-Null
Get-ChildItem -LiteralPath $destRoot -Directory -Filter "$extensionId-*" -ErrorAction SilentlyContinue |
  ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }

New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item (Join-Path $src "package.json") $dest
Copy-Item (Join-Path $src "extension.js") $dest
Copy-Item (Join-Path $src "sidebar-model.js") $dest
Copy-Item (Join-Path $src "sidebar-view.js") $dest
Copy-Item (Join-Path $src "README.md") $dest
Copy-Item (Join-Path $src ".vscodeignore") $dest -ErrorAction SilentlyContinue
Copy-Item (Join-Path $src "assets") (Join-Path $dest "assets") -Recurse
Copy-Item (Join-Path $src "editor") (Join-Path $dest "editor") -Recurse
Copy-Item (Join-Path $src "sidebar") (Join-Path $dest "sidebar") -Recurse

Write-Host "Installed to $dest"
Write-Host "Reload Cursor, then right-click an SVG -> Open with SVG manual editor."
