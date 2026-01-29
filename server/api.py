#!/usr/bin/env python3
"""
Backend API for Shoshin Web UI
Executes Matlantis calculation scripts and streams output to frontend
"""

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import shutil
import uuid
import glob
import zipfile
import tempfile
import io

# Add project root to path for script imports
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

app = FastAPI(title="Shoshin API", description="Backend for Matlantis calculations")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExecutionRequest(BaseModel):
    command: str
    working_dir: str | None = None


class ExecutionResponse(BaseModel):
    status: str
    message: str
    job_id: str | None = None


# Store active jobs
active_jobs: dict[str, subprocess.Popen] = {}
job_counter = 0


# Upload directory
UPLOAD_DIR = PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "shoshin-api"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a structure file and return its server path"""
    # Generate unique filename to avoid conflicts
    ext = Path(file.filename).suffix
    unique_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    file_path = UPLOAD_DIR / unique_name

    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "status": "ok",
        "filename": file.filename,
        "path": str(file_path),
    }


@app.post("/execute")
async def execute_command(request: ExecutionRequest) -> ExecutionResponse:
    """Start a calculation job (non-streaming)"""
    global job_counter
    job_counter += 1
    job_id = f"job_{job_counter}"

    working_dir = request.working_dir or str(PROJECT_ROOT)

    try:
        # Start the process
        process = subprocess.Popen(
            request.command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=working_dir,
            text=True,
            bufsize=1,
        )
        active_jobs[job_id] = process

        return ExecutionResponse(
            status="started",
            message=f"Job started: {job_id}",
            job_id=job_id,
        )
    except Exception as e:
        return ExecutionResponse(
            status="error",
            message=str(e),
            job_id=None,
        )


@app.websocket("/ws/execute")
async def websocket_execute(websocket: WebSocket):
    """WebSocket endpoint for streaming command execution"""
    await websocket.accept()

    try:
        # Receive the command
        data = await websocket.receive_text()
        request = json.loads(data)
        command = request.get("command", "")
        working_dir = request.get("working_dir", str(PROJECT_ROOT))

        if not command:
            await websocket.send_json({"type": "error", "message": "No command provided"})
            return

        # Send start message
        await websocket.send_json({
            "type": "start",
            "message": f"Starting: {command[:100]}...",
        })

        # Execute the command using bash with updated PATH
        env = os.environ.copy()
        home_dir = os.path.expanduser("~")
        env["PATH"] = f"{home_dir}/.local/bin:{env.get('PATH', '')}"

        process = await asyncio.create_subprocess_exec(
            "/bin/bash", "-c", command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=working_dir,
            env=env,
        )

        # Stream output
        total_output = ""
        while True:
            line = await process.stdout.readline()
            if not line:
                break

            decoded_line = line.decode("utf-8", errors="replace")
            total_output += decoded_line

            # Calculate approximate progress based on common patterns
            progress = estimate_progress(total_output)

            await websocket.send_json({
                "type": "output",
                "data": decoded_line,
                "progress": progress,
            })

        # Wait for process to complete
        return_code = await process.wait()

        # Send completion message
        await websocket.send_json({
            "type": "complete",
            "return_code": return_code,
            "message": "Calculation completed" if return_code == 0 else f"Process exited with code {return_code}",
        })

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
            })
        except Exception:
            pass  # Connection already closed
    finally:
        try:
            await websocket.close()
        except Exception:
            pass  # Already closed


def estimate_progress(output: str) -> int:
    """Estimate progress based on output patterns"""
    output_lower = output.lower()

    # Check for common progress indicators
    if "error" in output_lower or "failed" in output_lower:
        return -1  # Error state

    if "completed" in output_lower or "finished" in output_lower or "done" in output_lower:
        return 100

    # MD simulation progress
    if "step" in output_lower:
        # Try to extract step numbers
        import re
        steps = re.findall(r"step[:\s]+(\d+)", output_lower)
        if steps:
            current_step = int(steps[-1])
            # Assume 1000 steps by default, cap at 95%
            return min(95, int(current_step / 10))

    # Optimization progress
    if "iteration" in output_lower or "iter" in output_lower:
        import re
        iters = re.findall(r"(?:iteration|iter)[:\s]+(\d+)", output_lower)
        if iters:
            current_iter = int(iters[-1])
            return min(95, current_iter * 5)

    # Loading/initialization
    if "loading" in output_lower or "initializing" in output_lower:
        return 10
    if "calculator" in output_lower:
        return 20
    if "running" in output_lower or "starting" in output_lower:
        return 30

    return 50  # Default middle progress


@app.get("/jobs/{job_id}/status")
async def get_job_status(job_id: str):
    """Get status of a running job"""
    if job_id not in active_jobs:
        return {"status": "not_found", "job_id": job_id}

    process = active_jobs[job_id]
    poll = process.poll()

    if poll is None:
        return {"status": "running", "job_id": job_id}
    else:
        # Process completed
        del active_jobs[job_id]
        return {
            "status": "completed" if poll == 0 else "failed",
            "job_id": job_id,
            "return_code": poll,
        }


@app.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancel a running job"""
    if job_id not in active_jobs:
        return {"status": "not_found", "job_id": job_id}

    process = active_jobs[job_id]
    process.terminate()
    del active_jobs[job_id]

    return {"status": "cancelled", "job_id": job_id}


@app.get("/results/list")
async def list_results(output_dir: str = Query(..., description="Output directory path")):
    """List result files in the output directory"""
    output_path = Path(output_dir)

    # Security check: only allow paths within PROJECT_ROOT
    try:
        output_path = output_path.resolve()
        if not str(output_path).startswith(str(PROJECT_ROOT.resolve())):
            return {"status": "error", "message": "Access denied", "files": []}
    except Exception:
        return {"status": "error", "message": "Invalid path", "files": []}

    if not output_path.exists():
        return {"status": "error", "message": "Directory not found", "files": []}

    files = []

    # Find all files recursively
    for file_path in output_path.rglob("*"):
        if file_path.is_file():
            rel_path = file_path.relative_to(output_path)
            stat = file_path.stat()
            files.append({
                "name": file_path.name,
                "path": str(file_path),
                "relative_path": str(rel_path),
                "size": stat.st_size,
                "modified": stat.st_mtime,
            })

    # Sort by modification time (newest first)
    files.sort(key=lambda x: x["modified"], reverse=True)

    return {
        "status": "ok",
        "output_dir": str(output_path),
        "files": files,
    }


@app.get("/results/folders")
async def list_result_folders(output_dir: str = Query(..., description="Output directory path")):
    """List result folders (job folders) in the output directory"""
    output_path = Path(output_dir)

    # Security check: only allow paths within PROJECT_ROOT
    try:
        output_path = output_path.resolve()
        if not str(output_path).startswith(str(PROJECT_ROOT.resolve())):
            return {"status": "error", "message": "Access denied", "folders": []}
    except Exception:
        return {"status": "error", "message": "Invalid path", "folders": []}

    if not output_path.exists():
        return {"status": "error", "message": "Directory not found", "folders": []}

    folders = []

    # Find mms_runs folder first (Matlantis specific)
    mms_runs_path = output_path / "mms_runs"
    search_path = mms_runs_path if mms_runs_path.exists() else output_path

    # List immediate subdirectories
    for folder_path in search_path.iterdir():
        if folder_path.is_dir():
            # Count files in folder
            file_count = sum(1 for _ in folder_path.rglob("*") if _.is_file())
            # Calculate total size
            total_size = sum(f.stat().st_size for f in folder_path.rglob("*") if f.is_file())
            stat = folder_path.stat()
            folders.append({
                "name": folder_path.name,
                "path": str(folder_path),
                "file_count": file_count,
                "total_size": total_size,
                "modified": stat.st_mtime,
            })

    # Sort by modification time (newest first)
    folders.sort(key=lambda x: x["modified"], reverse=True)

    return {
        "status": "ok",
        "output_dir": str(output_path),
        "folders": folders,
    }


@app.get("/download/folder")
async def download_folder_as_zip(folder_path: str = Query(..., description="Folder path to download as ZIP")):
    """Download a folder as ZIP file"""
    folder_path = Path(folder_path)

    # Security check: only allow paths within PROJECT_ROOT
    try:
        folder_path = folder_path.resolve()
        if not str(folder_path).startswith(str(PROJECT_ROOT.resolve())):
            return {"status": "error", "message": "Access denied"}
    except Exception:
        return {"status": "error", "message": "Invalid path"}

    if not folder_path.exists():
        return {"status": "error", "message": "Folder not found"}

    if not folder_path.is_dir():
        return {"status": "error", "message": "Not a folder"}

    # Create ZIP file in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in folder_path.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(folder_path.parent)
                zip_file.write(file_path, arcname)

    zip_buffer.seek(0)

    # Create a temporary file to serve
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    temp_zip.write(zip_buffer.getvalue())
    temp_zip.close()

    return FileResponse(
        path=temp_zip.name,
        filename=f"{folder_path.name}.zip",
        media_type="application/zip",
        background=None,  # Don't delete immediately
    )


@app.get("/download")
async def download_file(file_path: str = Query(..., description="File path to download")):
    """Download a result file"""
    file_path = Path(file_path)

    # Security check: only allow paths within PROJECT_ROOT
    try:
        file_path = file_path.resolve()
        if not str(file_path).startswith(str(PROJECT_ROOT.resolve())):
            return {"status": "error", "message": "Access denied"}
    except Exception:
        return {"status": "error", "message": "Invalid path"}

    if not file_path.exists():
        return {"status": "error", "message": "File not found"}

    if not file_path.is_file():
        return {"status": "error", "message": "Not a file"}

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
