@echo off
cd /d "%~dp0"
echo SVG manual editor: http://localhost:8765/editor/index.html
start "" "http://localhost:8765/editor/index.html"
python -m http.server 8765
