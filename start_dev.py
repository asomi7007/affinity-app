#!/usr/bin/env python3
"""
Affinity Diagram Web App - Development Server Starter
Starts both backend (FastAPI) and frontend (React/Vite) in parallel
"""
import os
import sys
import subprocess
import threading
import time
import signal
from pathlib import Path

# Get the directory where this script is located
script_dir = Path(__file__).parent.absolute()
backend_dir = script_dir / "backend"
frontend_dir = script_dir / "frontend"

# Global variables to track processes
backend_process = None
frontend_process = None


def start_backend():
    """Start the FastAPI backend server"""
    global backend_process
    print("🚀 Starting FastAPI backend server...")
    
    # Change to backend directory and start server
    os.chdir(backend_dir)
    sys.path.insert(0, str(backend_dir))
    
    try:
        backend_process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", 
            "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ], cwd=backend_dir)
        print("✅ Backend server started on http://localhost:8000")
        print("📖 API Documentation: http://localhost:8000/docs")
        backend_process.wait()
    except Exception as e:
        print(f"❌ Error starting backend: {e}")


def start_frontend():
    """Start the React/Vite frontend server"""
    global frontend_process
    print("🎨 Starting React frontend server...")
    
    try:
        frontend_process = subprocess.Popen([
            "npm", "run", "dev"
        ], cwd=frontend_dir)
        print("✅ Frontend server started on http://localhost:5173")
        frontend_process.wait()
    except Exception as e:
        print(f"❌ Error starting frontend: {e}")


def signal_handler(signum, frame):
    """Handle Ctrl+C gracefully"""
    print("\n🛑 Shutting down servers...")
    
    if backend_process:
        backend_process.terminate()
        print("✅ Backend server stopped")
    
    if frontend_process:
        frontend_process.terminate()
        print("✅ Frontend server stopped")
    
    sys.exit(0)


def main():
    """Main function to start both servers"""
    print("🌟 Affinity Diagram Web App - Development Environment")
    print("=" * 50)
    
    # Check dependencies
    if not backend_dir.exists():
        print("❌ Backend directory not found!")
        sys.exit(1)
    
    if not frontend_dir.exists():
        print("❌ Frontend directory not found!")
        sys.exit(1)
    
    if not (backend_dir / "requirements.txt").exists():
        print("❌ Backend requirements.txt not found!")
        sys.exit(1)
    
    if not (frontend_dir / "package.json").exists():
        print("❌ Frontend package.json not found!")
        sys.exit(1)
    
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start both servers in separate threads
    backend_thread = threading.Thread(target=start_backend, daemon=True)
    frontend_thread = threading.Thread(target=start_frontend, daemon=True)
    
    backend_thread.start()
    time.sleep(2)  # Give backend a moment to start
    frontend_thread.start()
    
    print("\n📋 Server Status:")
    print("   Backend:  http://localhost:8000")
    print("   Frontend: http://localhost:5173")
    print("   WebSocket: ws://localhost:8000/ws/board/dev-board")
    print("\n💡 Press Ctrl+C to stop both servers")
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)


if __name__ == "__main__":
    main()