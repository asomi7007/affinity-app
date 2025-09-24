#!/usr/bin/env python3
import os
import sys
import uvicorn
from pathlib import Path

# Get the directory where this script is located
script_dir = Path(__file__).parent.absolute()
backend_dir = script_dir / "backend"

# Set the current directory to backend
os.chdir(backend_dir)
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)