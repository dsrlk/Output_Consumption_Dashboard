from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import endpoints, analytics
from app.core.database import engine, Base

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Consumption Report API",
    description="Backend for analyzing production consumption reports",
    version="1.0.0"
)

# CORS Middleware to allow React Frontend
# Allow all origins so Vercel can access it seamlessly, keeping it simple
# Just relying on password auth for the Datahub routes.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(endpoints.router, prefix="/api", tags=["General Operations"])
app.include_router(analytics.router, prefix="/api/dashboard", tags=["Dashboard Analytics"])

@app.get("/")
def root():
    return {"message": "Consumption Report API is running"}

@app.get("/debug")
def debug():
    import os
    cwd = os.getcwd()
    files_in_cwd = os.listdir(cwd)
    db_path = os.path.join(cwd, "data.db")
    db_exists = os.path.exists(db_path)
    db_size = os.path.getsize(db_path) if db_exists else 0
    return {
        "cwd": cwd,
        "files_in_cwd": files_in_cwd,
        "db_path": db_path,
        "db_exists": db_exists,
        "db_size_bytes": db_size
    }
