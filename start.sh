#!/bin/bash

# Medical IR Pipeline - Start Script
# This script runs both the FastAPI backend and the LiveKit agent

echo "🏥 Starting Medical IR Pipeline..."
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "   Please copy .env.example to .env and fill in your credentials:"
    echo "   cp .env.example .env"
    echo ""
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Activate virtual environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
    echo "✓ Virtual environment activated"
else
    echo "❌ Error: .venv not found. Please run: python -m venv .venv"
    exit 1
fi

# Start FastAPI in the background
echo ""
echo "🚀 Starting FastAPI backend on http://localhost:8000..."
cd backend
python main.py &
FASTAPI_PID=$!

# Wait for FastAPI to start
sleep 3

# Start LiveKit Agent
echo ""
echo "🤖 Starting LiveKit Agent..."
python agent.py dev &
AGENT_PID=$!

echo ""
echo "✅ All services started!"
echo ""
echo "   FastAPI: http://localhost:8000"
echo "   Frontend: Open frontend/index.html in your browser"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping services...'; kill $FASTAPI_PID $AGENT_PID 2>/dev/null; exit" INT
wait
