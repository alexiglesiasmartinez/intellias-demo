import anyio
import pytest
from fastapi.testclient import TestClient
from app.main import (
    app as fastapi_app,
    raw_logs_queue, 
    processed_stats, 
    dead_letter_queue
)

@pytest.fixture
def client():
    raw_logs_queue.clear()
    dead_letter_queue.clear()
    processed_stats.update({"INFO": 0, "ERROR": 0, "WARNING": 0, "CRITICAL": 0})    
    import app.main
    app.main.is_paused = False
    with TestClient(fastapi_app) as c:
        yield c

@pytest.mark.anyio
async def test_log_ingestion(client):

    """Test 1: Does the /api/log endpoint accept a log?"""

    response = client.post(
        "/api/log",
        json={"level": "INFO", "message": "Test log"}
    )
    assert response.status_code == 202
    assert response.json() == {"status": "log_queued"}
    assert len(raw_logs_queue) == 1

@pytest.mark.anyio
async def test_worker_processing_success(client):

    """Test 2: Does a valid log get processed and update the stats?"""

    client.post(
        "/api/log",
        json={"level": "INFO", "message": "A log that should work"}
    )    
    await anyio.sleep(2.5)    
    response = client.get("/api/stats")
    assert response.status_code == 200
    assert response.json()["INFO"] == 1

@pytest.mark.anyio
async def test_worker_dlq_failure(client):

    """Test 3: Does a 'CRITICAL' log go to the Dead-Letter Queue?"""

    client.post(
        "/api/log",
        json={"level": "CRITICAL", "message": "A log that should fail"}
    )    
    await anyio.sleep(2.5)    
    response = client.get("/api/dlq-status")
    assert response.status_code == 200
    assert response.json()["queue_size"] == 1
    assert response.json()["items"][0]["level"] == "CRITICAL"    
    stats = client.get("/api/stats")
    assert stats.json()["INFO"] == 0
    assert stats.json().get("CRITICAL") is None

@pytest.mark.anyio
async def test_worker_pause_and_resume(client):

    """Test 4: Does the Pause/Resume functionality work?"""

    client.post("/api/pause")    
    client.post(
        "/api/log",
        json={"level": "WARNING", "message": "A log sent while paused"}
    )    
    await anyio.sleep(2.5)    
    response = client.get("/api/queue-status")
    assert response.json()["queue_size"] == 1     
    stats_response = client.get("/api/stats")
    assert stats_response.json()["WARNING"] == 0    
    client.post("/api/resume")    
    await anyio.sleep(3)    
    response = client.get("/api/queue-status")
    assert response.json()["queue_size"] == 0    
    stats_response_after = client.get("/api/stats")
    assert stats_response_after.json()["WARNING"] == 1