from sqlalchemy import Column, String, Float, DateTime, Enum as SQLEnum, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
import enum
from app.db.config import Base

class StepStatus(str, enum.Enum):
    STARTED = "started"
    SUCCESS = "success"
    FAILED = "failed"

class AgentStep(Base):
    __tablename__ = "agent_steps"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    run_id = Column(String, ForeignKey("agent_runs.id"), nullable=False)
    step_name = Column(String, nullable=False)
    tool_name = Column(String, nullable=True)
    input = Column(JSON, nullable=True)
    output = Column(JSON, nullable=True)
    status = Column(SQLEnum(StepStatus), default=StepStatus.STARTED)
    error = Column(Text, nullable=True)
    cost = Column(Float, nullable=True, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    run = relationship("AgentRun", back_populates="steps")
