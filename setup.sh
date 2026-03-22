#!/bin/bash

# Setup script for Linux/Mac development environment
# Usage: bash setup.sh

set -e

echo "================================"
echo "Iris Transcription Backend Setup"
echo "================================"
echo ""

# Check Python
echo "[1/5] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.10+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1)
echo "✓ Found: $PYTHON_VERSION"
echo ""

# Create virtual environment
echo "[2/5] Setting up Python virtual environment..."
if [ -d "./backend/.venv" ]; then
    echo "✓ Virtual environment already exists"
    echo ""
else
    python3 -m venv "./backend/.venv"
    echo "✓ Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "[3/5] Activating virtual environment..."
source "./backend/.venv/bin/activate"
echo "✓ Virtual environment activated"
echo ""

# Install dependencies
echo "[4/5] Installing dependencies..."
pip install -q -r "./backend/requirements.txt"
echo "✓ Dependencies installed"
echo ""

# Setup .env file
echo "[5/5] Setting up environment configuration..."
if [ -f "./backend/.env" ]; then
    echo "✓ .env file already exists"
    echo ""
else
    cp "./backend/.env.example" "./backend/.env"
    echo "✓ Created .env from template"
    echo ""
fi

echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""

echo "Next steps:"
echo ""

echo "1. Configure environment variables:"
echo "   Edit ./backend/.env with your credentials:"
echo "   - Get AssemblyAI key from: https://www.assemblyai.com"
echo "   - Configure n8n webhook URL"
echo ""

echo "2. Start the backend:"
echo "   cd backend"
echo "   python main.py"
echo ""

echo "3. In another terminal, validate setup:"
echo "   source ./backend/.venv/bin/activate"
echo "   cd backend"
echo "   python test_validation.py"
echo ""

echo "Documentation:"
echo "- Backend README: ./backend/README.md"
echo "- Integration Guide: ./INTEGRATION_GUIDE.md"
echo "- Setup Guide: ./SETUP_AND_DEPLOYMENT.md"
echo "- API Reference: ./API_REFERENCE.md"
echo ""

echo "Happy coding! 🚀"
