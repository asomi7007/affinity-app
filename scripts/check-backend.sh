#!/bin/bash

echo "Checking backend server..."

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✓ Backend server is running"
    exit 0
else
    echo "✗ Backend server is not running"
    echo ""
    echo "Please start the backend server first:"
    echo "  cd backend"
    echo "  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    echo ""
    echo "Or use the start script:"
    echo "  ./start.sh"
    exit 1
fi
