from pydantic import BaseModel
from typing import Optional, Any, List
from datetime import datetime

# ===== REQUEST SCHEMAS =====

class StartRunRequest(BaseModel):
    user_query: str

class LogStepRequest(BaseModel):
    run_id: str
    step_name: str
    tool_name: Optional[str] = None
    input: Optional[Any] = None

class CompleteStepRequest(BaseModel):
    run_id: str
    step_name: str
    output: Optional[Any] = None

class ErrorStepRequest(BaseModel):
    run_id: str
    step_name: str
    error: str

# ===== RESPONSE SCHEMAS =====

class AgentStepResponse(BaseModel):
    id: str
    run_id: str
    step_name: str
    tool_name: Optional[str] = None
    input: Optional[Any] = None
    output: Optional[Any] = None
    status: str
    error: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class AgentRunDetailResponse(BaseModel):
    id: str
    user_query: str
    status: str
    created_at: str
    updated_at: str
    steps: List[AgentStepResponse] = []

    class Config:
        from_attributes = True

class AgentRunListItemResponse(BaseModel):
    id: str
    user_query: str
    status: str
    created_at: str
    step_count: int

    class Config:
        from_attributes = True

class StartRunResponse(BaseModel):
    id: str
    user_query: str
    status: str
    created_at: str
