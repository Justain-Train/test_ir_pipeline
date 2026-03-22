# Setup script for Windows development environment
# Run as: powershell -ExecutionPolicy Bypass -File setup.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Iris Transcription Backend Setup" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

# Check Python
Write-Host "[1/5] Checking Python installation..." -ForegroundColor Yellow
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if ($null -eq $pythonCmd) {
    Write-Host "[ERROR] Python not found. Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

$pythonVersion = python --version 2>&1
Write-Host "[OK] Found: $pythonVersion`n" -ForegroundColor Green

# Create virtual environment
Write-Host "[2/5] Setting up Python virtual environment..." -ForegroundColor Yellow
if (Test-Path ".\backend\.venv") {
    Write-Host "[OK] Virtual environment already exists`n" -ForegroundColor Green
} else {
    python -m venv ".\backend\.venv"
    if ($?) {
        Write-Host "[OK] Virtual environment created`n" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

# Activate virtual environment
Write-Host "[3/5] Activating virtual environment..." -ForegroundColor Yellow
& ".\backend\.venv\Scripts\Activate.ps1"
Write-Host "[OK] Virtual environment activated`n" -ForegroundColor Green

# Install dependencies
Write-Host "[4/5] Installing dependencies..." -ForegroundColor Yellow
pip install -q -r ".\backend\requirements.txt"
if ($?) {
    Write-Host "[OK] Dependencies installed`n" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Setup .env file
Write-Host "[5/5] Setting up environment configuration..." -ForegroundColor Yellow
if (Test-Path ".\backend\.env") {
    Write-Host "[OK] .env file already exists`n" -ForegroundColor Green
} else {
    Copy-Item ".\backend\.env.example" ".\backend\.env"
    Write-Host "[OK] Created .env from template`n" -ForegroundColor Green
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "Next steps:`n" -ForegroundColor Yellow

Write-Host "1. Configure environment variables:" -ForegroundColor White
Write-Host "   Edit ./backend/.env with your credentials:" -ForegroundColor Gray
Write-Host "   - Get AssemblyAI key from: https://www.assemblyai.com" -ForegroundColor Gray
Write-Host "   - Configure n8n webhook URL`n" -ForegroundColor Gray

Write-Host "2. Start the backend:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   python main.py`n" -ForegroundColor Gray

Write-Host "3. In another terminal, validate setup:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   python test_validation.py`n" -ForegroundColor Gray

Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "- Backend README: ./backend/README.md" -ForegroundColor Gray
Write-Host "- Integration Guide: ./INTEGRATION_GUIDE.md" -ForegroundColor Gray
Write-Host "- Setup Guide: ./SETUP_AND_DEPLOYMENT.md" -ForegroundColor Gray
Write-Host "- API Reference: ./API_REFERENCE.md`n" -ForegroundColor Gray

Write-Host "Happy coding! 🚀" -ForegroundColor Cyan
