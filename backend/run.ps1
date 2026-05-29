# Run the FOOD FOR ANY MOOD FastAPI backend on port 8010.
# If port 8010 is already in use, stop the other app first.
#
# Usage (PowerShell):
#   cd backend
#   .\run.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "[FOOD FOR ANY MOOD] Starting backend on http://127.0.0.1:8010"
py -m uvicorn main:app --reload --host 127.0.0.1 --port 8010
