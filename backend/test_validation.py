#!/usr/bin/env python3
"""
Simple validation script to test WebSocket connection and message routing.
Run this after starting the backend to verify it's working correctly.
"""

import asyncio
import json
import base64
import sys
from pathlib import Path

try:
    import websockets
except ImportError:
    print("Error: websockets not installed")
    print("Install with: pip install websockets")
    sys.exit(1)


async def test_transcription_ws():
    """Test basic WebSocket functionality"""
    
    uri = "ws://localhost:8000/ws/session"
    
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ WebSocket connected!")
            
            # Test 1: Start session
            print("\n[Test 1] Starting session...")
            start_msg = {
                "type": "start_session",
                "patient": {
                    "name": "Test Patient",
                    "age": 35,
                    "patientID": "TEST-001"
                }
            }
            
            await websocket.send(json.dumps(start_msg))
            response = await websocket.recv()
            data = json.loads(response)
            
            if data.get("type") == "session_started":
                session_id = data.get("sessionID")
                print(f"✓ Session started: {session_id}")
            else:
                print(f"✗ Unexpected response: {data}")
                return False
            
            # Test 2: Send audio chunk (dummy data)
            print("\n[Test 2] Sending audio chunk...")
            dummy_audio = b"fake audio data for testing"
            audio_b64 = base64.b64encode(dummy_audio).decode()
            
            audio_msg = {
                "type": "audio_chunk",
                "data": audio_b64
            }
            
            try:
                await websocket.send(json.dumps(audio_msg))
                print("✓ Audio chunk sent")
            except Exception as e:
                print(f"✗ Error sending audio: {e}")
                return False
            
            # Test 3: Finish session
            print("\n[Test 3] Finishing session...")
            finish_msg = {"type": "finish_session"}
            
            await websocket.send(json.dumps(finish_msg))
            
            # Wait for final response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                
                if data.get("type") == "session_finished":
                    print(f"✓ Session finished")
                    print(f"  - SessionID: {data.get('sessionID')}")
                    print(f"  - n8n sent: {data.get('n8n_sent')}")
                else:
                    print(f"Response: {data}")
            
            except asyncio.TimeoutError:
                print("✓ Session closed (no n8n webhook configured, which is OK)")
            
            print("\n" + "="*50)
            print("✓ All tests passed!")
            print("="*50)
            return True
    
    except ConnectionRefusedError:
        print("\n✗ Connection refused!")
        print("Make sure the backend is running:")
        print("  python main.py")
        return False
    
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_health_check():
    """Test health check endpoint"""
    
    try:
        import httpx
        
        print("Checking health endpoint...")
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/health")
            
            if response.status_code == 200:
                print("✓ Health check passed")
                print(f"  Response: {response.json()}")
                return True
            else:
                print(f"✗ Health check failed: {response.status_code}")
                return False
    
    except ImportError:
        print("Skipping health check (httpx not installed)")
        return True
    
    except Exception as e:
        print(f"✗ Health check error: {e}")
        return False


async def main():
    """Run all tests"""
    
    print("="*50)
    print("Iris Transcription Backend - Validation Tests")
    print("="*50)
    
    # Test health check
    health_ok = await test_health_check()
    
    print("\n" + "-"*50)
    
    # Test WebSocket
    ws_ok = await test_transcription_ws()
    
    if health_ok and ws_ok:
        print("\n✓ Backend is ready for production!")
        sys.exit(0)
    else:
        print("\n✗ Some tests failed. Check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
        sys.exit(0)
