#!/bin/bash

# Affinity Diagram Web App - Development Server Starter (Shell Script)
# Alternative to the Python version for environments that prefer shell scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌟 Affinity Diagram Web App - Development Environment${NC}"
echo "=================================================="

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found!${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found!${NC}"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    
    # Kill background jobs
    jobs -p | xargs -r kill
    
    echo -e "${GREEN}✅ All servers stopped${NC}"
    exit 0
}

# Set trap for cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

echo -e "${BLUE}🚀 Starting FastAPI backend server...${NC}"
cd "$BACKEND_DIR"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

echo -e "${GREEN}✅ Backend server started on http://localhost:8000${NC}"
echo -e "${BLUE}📖 API Documentation: http://localhost:8000/docs${NC}"

echo -e "${BLUE}🎨 Starting React frontend server...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

echo -e "${GREEN}✅ Frontend server started on http://localhost:5173${NC}"

echo ""
echo -e "${BLUE}📋 Server Status:${NC}"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"  
echo "   WebSocket: ws://localhost:8000/ws/board/dev-board"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop both servers${NC}"

# Wait for user to stop
wait