from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.config import engine, Base
from app.routes import agent

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Agent Control Room API",
    description="Observability system for AI agents",
    version="1.0.0"
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(agent.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "agent-control-room"}
