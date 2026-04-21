from sqlalchemy.orm import Session
from app.models import AgentRun, AgentStep, RunStatus, StepStatus
from datetime import datetime
from typing import Optional, Any
from uuid import uuid4

class AgentLogger:
    """Reusable logging utility for agent runs - core logging functions"""
    
    @staticmethod
    def log_run_start(db: Session, user_query: str) -> str:
        """Start a new agent run. Returns run_id"""
        run = AgentRun(
            id=str(uuid4()),
            user_query=user_query,
            status=RunStatus.RUNNING,
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run.id
    
    @staticmethod
    def log_step_start(
        db: Session,
        run_id: str,
        step_name: str,
        tool_name: Optional[str] = None,
        input_data: Optional[Any] = None,
    ) -> str:
        """Log the start of a step. Returns step_id"""
        step = AgentStep(
            id=str(uuid4()),
            run_id=run_id,
            step_name=step_name,
            tool_name=tool_name,
            input=input_data,
            status=StepStatus.STARTED,
        )
        db.add(step)
        db.commit()
        db.refresh(step)
        return step.id
    
    @staticmethod
    def log_step_success(
        db: Session,
        run_id: str,
        step_name: str,
        output_data: Optional[Any] = None,
        cost: float = 0.0,
    ) -> None:
        """Log successful step completion"""
        # Get the most recent step with this name for this run
        step = db.query(AgentStep).filter(
            AgentStep.run_id == run_id,
            AgentStep.step_name == step_name
        ).order_by(AgentStep.created_at.desc()).first()
        
        if step:
            step.status = StepStatus.SUCCESS
            step.output = output_data
            step.cost = cost
            step.updated_at = datetime.utcnow()
            db.commit()
        
        # Update run's total cost
        AgentLogger._update_run_cost(db, run_id)
    
    @staticmethod
    def log_step_error(
        db: Session,
        run_id: str,
        step_name: str,
        error: str,
    ) -> None:
        """Log step error and mark run as failed"""
        # Get the most recent step with this name for this run
        step = db.query(AgentStep).filter(
            AgentStep.run_id == run_id,
            AgentStep.step_name == step_name
        ).order_by(AgentStep.created_at.desc()).first()
        
        if step:
            step.status = StepStatus.FAILED
            step.error = error
            step.updated_at = datetime.utcnow()
            db.commit()
        
        # Mark run as failed
        AgentLogger._mark_run_failed(db, run_id)
    
    @staticmethod
    def complete_run(db: Session, run_id: str, success: bool = True) -> None:
        """Mark run as complete (success or failed)"""
        run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
        if run:
            run.status = RunStatus.SUCCESS if success else RunStatus.FAILED
            run.updated_at = datetime.utcnow()
            db.commit()
    
    # ===== PRIVATE HELPERS =====
    
    @staticmethod
    def _update_run_cost(db: Session, run_id: str) -> None:
        """Recalculate and update run's total cost"""
        steps = db.query(AgentStep).filter(AgentStep.run_id == run_id).all()
        total_cost = sum(step.cost or 0.0 for step in steps)
        
        run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
        if run:
            run.total_cost = total_cost
            run.updated_at = datetime.utcnow()
            db.commit()
    
    @staticmethod
    def _mark_run_failed(db: Session, run_id: str) -> None:
        """Mark run as failed"""
        run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
        if run:
            run.status = RunStatus.FAILED
            run.updated_at = datetime.utcnow()
            db.commit()
