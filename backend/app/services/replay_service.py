from sqlalchemy.orm import Session
from app.models import AgentRun
from app.services.logger import AgentLogger
from typing import Optional

class ReplayService:
    """Service for replaying previous runs"""
    
    @staticmethod
    def replay_run(db: Session, original_run_id: str, user_query: Optional[str] = None) -> Optional[str]:
        """
        Start a replay by creating a new run with the same (or custom) query.
        Returns the new run_id.
        
        The agent should then re-execute using this new run_id, and logging will
        automatically capture it as a separate execution.
        """
        original_run = db.query(AgentRun).filter(AgentRun.id == original_run_id).first()
        
        if not original_run:
            return None
        
        # Use original query or provided query
        query_to_run = user_query or original_run.user_query
        
        # Create new run
        new_run_id = AgentLogger.log_run_start(db, query_to_run)
        
        return new_run_id
    
    @staticmethod
    def get_replay_reference(db: Session, run_id: str) -> Optional[dict]:
        """Get the execution steps from a run for reference during replay"""
        run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
        
        if not run:
            return None
        
        return {
            "original_run_id": run.id,
            "query": run.user_query,
            "status": run.status.value,
            "total_steps": len(run.steps),
            "steps": [
                {
                    "step_name": step.step_name,
                    "tool_name": step.tool_name,
                    "status": step.status.value,
                }
                for step in run.steps
            ],
        }
