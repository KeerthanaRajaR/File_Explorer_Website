from sqlalchemy.orm import Session
from app.models import AgentRun, AgentStep
from app.schemas.agent import AgentRunDetailResponse, AgentRunListItemResponse, AgentStepResponse
from typing import List, Optional

class RunService:
    """Service layer for run queries and management"""
    
    @staticmethod
    def get_all_runs(db: Session, skip: int = 0, limit: int = 50) -> List[AgentRunListItemResponse]:
        """Get paginated list of runs"""
        runs = db.query(AgentRun).order_by(AgentRun.created_at.desc()).offset(skip).limit(limit).all()
        
        result = []
        for run in runs:
            result.append(AgentRunListItemResponse(
                id=run.id,
                user_query=run.user_query,
                status=run.status.value,
                created_at=run.created_at.isoformat(),
                step_count=len(run.steps),
            ))
        
        return result
    
    @staticmethod
    def get_run_detail(db: Session, run_id: str) -> Optional[AgentRunDetailResponse]:
        """Get detailed run info with all steps"""
        run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
        
        if not run:
            return None
        
        # Convert steps to response schema
        steps = []
        for step in run.steps:
            steps.append(AgentStepResponse(
                id=step.id,
                run_id=step.run_id,
                step_name=step.step_name,
                tool_name=step.tool_name,
                input=step.input,
                output=step.output,
                status=step.status.value,
                error=step.error,
                created_at=step.created_at.isoformat(),
                updated_at=step.updated_at.isoformat(),
            ))
        
        return AgentRunDetailResponse(
            id=run.id,
            user_query=run.user_query,
            status=run.status.value,
            created_at=run.created_at.isoformat(),
            updated_at=run.updated_at.isoformat(),
            steps=steps,
        )
    
    @staticmethod
    def delete_run(db: Session, run_id: str) -> bool:
        """Delete a run and all its steps"""
        run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
        if run:
            db.delete(run)
            db.commit()
            return True
        return False
