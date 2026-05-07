Write-Host ">>> Preparing AI Server..." -ForegroundColor Cyan

# 1. Directory Settings
$AI_DIR = "apps/ai_server"
$VENV_PATH = "$AI_DIR/.venv"

# 2. Create venv if not exists
if (-not (Test-Path $VENV_PATH)) {
    Write-Host ">>> Virtual environment not found. Creating a new one..." -ForegroundColor Yellow
    python -m venv $VENV_PATH
}

# 3. Activate venv and install dependencies
Write-Host ">>> Activating venv and checking dependencies..." -ForegroundColor Yellow
& "$VENV_PATH/Scripts/Activate.ps1"
pip install -r "$AI_DIR/requirements.txt"

# 4. Start Server (Set PYTHONPATH to 'apps' to resolve package imports)
Write-Host ">>> Starting AI Server (http://localhost:8000)..." -ForegroundColor Green
$env:PYTHONPATH = "apps"
uvicorn ai_server.main:app --reload --port 8000
