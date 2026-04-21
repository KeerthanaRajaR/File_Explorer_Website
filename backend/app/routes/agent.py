from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.config import get_db
from app.schemas.agent import (
    StartRunRequest,
    StartRunResponse,
    LogStepRequest,
    CompleteStepRequest,
    ErrorStepRequest,
    AgentRunDetailResponse,
    AgentRunListItemResponse,
)
from app.services.logger import AgentLogger
from app.services.run_service import RunService
from app.services.replay_service import ReplayService
from app.models import AgentRun

router = APIRouter(prefix="/agent", tags=["agent"])

# ===== 1. START RUN =====
@router.post("/run", response_model=StartRunResponse)
def start_run(request: StartRunRequest, db: Session = Depends(get_db)):
    """Start a new agent run"""
    run_id = AgentLogger.log_run_start(db, request.user_query)
    
    run = db.query(AgentRun).filter_by(id=run_id).first()
    return StartRunResponse(
        id=run_id,
        user_query=request.user_query,
        status="running",
        created_at=run.created_at.isoformat(),
    )

# ===== 2. LOG STEP =====
@router.post("/step")
def log_step(request: LogStepRequest, db: Session = Depends(get_db)):
    """Log a step start"""
    try:
        step_id = AgentLogger.log_step_start(
            db,
            request.run_id,
            request.step_name,
            request.tool_name,
            request.input,
        )
        return {"status": "ok", "step_id": step_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== 3. COMPLETE STEP (success) =====
@router.post("/step/complete")
def complete_step(request: CompleteStepRequest, db: Session = Depends(get_db)):
    """Mark a step as completed successfully"""
    try:
        AgentLogger.log_step_success(
            db,
            request.run_id,
            request.step_name,
            request.output,
            0.0,
        )
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== 4. ERROR STEP =====
@router.post("/step/error")
def error_step(request: ErrorStepRequest, db: Session = Depends(get_db)):
    """Mark a step as failed with error"""
    try:
        AgentLogger.log_step_error(
            db,
            request.run_id,
            request.step_name,
            request.error,
        )
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== 5. GET ALL RUNS =====
@router.get("/runs", response_model=list[AgentRunListItemResponse])
def get_runs(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Get list of all agent runs"""
    return RunService.get_all_runs(db, skip, limit)

# ===== 6. GET RUN DETAILS =====
@router.get("/runs/{run_id}", response_model=AgentRunDetailResponse)
def get_run_detail(run_id: str, db: Session = Depends(get_db)):
    """Get detailed info for a specific run"""
    run = RunService.get_run_detail(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run

# ===== 7. REPLAY RUN =====
@router.post("/replay/{run_id}")
def replay_run(run_id: str, user_query: str = None, db: Session = Depends(get_db)):
    """Replay a previous run (creates new run with same query)"""
    new_run_id = ReplayService.replay_run(db, run_id, user_query)
    if not new_run_id:
        raise HTTPException(status_code=404, detail="Original run not found")
    return {"new_run_id": new_run_id, "status": "replay_started"}

# ===== 8. GET REPLAY REFERENCE =====
@router.get("/replay/{run_id}/reference")
def get_replay_reference(run_id: str, db: Session = Depends(get_db)):
    """Get execution steps from a run for reference"""
    ref = ReplayService.get_replay_reference(db, run_id)
    if not ref:
        raise HTTPException(status_code=404, detail="Run not found")
    return ref
