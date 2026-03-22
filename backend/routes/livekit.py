"""
LiveKit Routes
- /token: Generate access tokens for room participants
- /webhook: Handle LiveKit room events
"""
import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from livekit import api
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")

if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
    raise ValueError("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set in environment variables")


class TokenRequest(BaseModel):
    room_name: str
    participant_name: str
    patient_id: str


@router.post("/token")
async def create_token(request: TokenRequest):
    """
    Generate a LiveKit access token for a participant
    Includes patient_id in metadata for downstream processing
    """
    try:
        # Create metadata JSON string
        metadata = f'{{"patient_id": "{request.patient_id}"}}'
        
        # Generate access token with video grants
        grant = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
            .with_identity(request.participant_name) \
            .with_name(request.participant_name) \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=request.room_name,
            )) \
            .with_metadata(metadata)
        
        token = grant.to_jwt()

        return {
            "token": token,
            "url": LIVEKIT_URL,
            "room_name": request.room_name
        }
        
    except Exception as e:
        logger.error(f"Error generating token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Token generation failed: {str(e)}")


@router.post("/webhook")
async def webhook_handler(request: Request):
    """
    Handle LiveKit webhook events (e.g., room_finished, participant_joined)
    Used for cleanup and logging purposes
    """
    try:
        body = await request.json()
        event_type = body.get("event")
        
        logger.info(f"Received LiveKit webhook: {event_type}")
        
        if event_type == "room_finished":
            room_name = body.get("room", {}).get("name")
            logger.info(f"Room finished: {room_name}")
            # Add any cleanup logic here
            
        elif event_type == "participant_joined":
            participant = body.get("participant", {})
            logger.info(f"Participant joined: {participant.get('identity')}")
            
        return {"status": "received", "event": event_type}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
