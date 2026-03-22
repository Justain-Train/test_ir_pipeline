"""
FastAPI Main Application
Handles CORS, routes, and webhook endpoints for LiveKit integration
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.livekit import router as livekit_router

app = FastAPI(title="Medical IR Pipeline API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include LiveKit routes
app.include_router(livekit_router, prefix="/livekit", tags=["LiveKit"])

@app.get("/")
async def root():
    return {
        "message": "Medical IR Pipeline API",
        "status": "running",
        "endpoints": {
            "token": "/livekit/token",
            "webhook": "/livekit/webhook"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
