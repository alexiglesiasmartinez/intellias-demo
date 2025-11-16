import asyncio
import uuid
import time
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict, Literal
from contextlib import asynccontextmanager

# --- Pydantic Models ---
LOG_LEVELS = Literal["INFO", "ERROR", "WARNING", "CRITICAL"]

class LogMessageIn(BaseModel):
    level: LOG_LEVELS
    message: str

class LogMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = Field(default_factory=time.time)
    level: LOG_LEVELS
    message: str

# --- In-Memory "Databases" & Worker State ---
raw_logs_queue: List[LogMessage] = []
processed_stats: Dict[str, int] = {"INFO": 0, "ERROR": 0, "WARNING": 0, "CRITICAL": 0}
dead_letter_queue: List[LogMessage] = []
is_paused = False
background_task = None

async def process_logs_task():
    print("ETL background worker started...")
    while True:
        try:
            # 1. Check the pause FIRST
            if is_paused:
                await asyncio.sleep(1)
                continue

            # 2. Check if there is work
            if raw_logs_queue:
                # 3. Do the “work” (sleep) NOW!
                await asyncio.sleep(2)
                
                # 4. Check again if they paused us WHILE we were sleeping.
                if is_paused:
                    continue
                
                # 5. If everything is OK, process the log.
                log = raw_logs_queue.pop(0)
                
                if log.level == "CRITICAL":
                    print(f"[ETL WORKER] FAILED to process log: {log.id}. Moving to DLQ.")
                    dead_letter_queue.append(log)
                else:
                    print(f"[ETL WORKER] Processing log: {log.level} ({log.id})")
                    if log.level in processed_stats:
                        processed_stats[log.level] += 1
                    print(f"[ETL WORKER] Stats updated: {processed_stats}")
            else:
                # 6. If there is no queue, sleep a little so as not to burn out the CPU.
                await asyncio.sleep(0.1)
        
        except asyncio.CancelledError:
            print("ETL background worker stopping...")
            break
        except Exception as e:
            print(f"ETL worker error: {e}")
            await asyncio.sleep(5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global background_task
    print("Application starting up... Creating background ETL worker.")
    background_task = asyncio.create_task(process_logs_task())
    
    yield
    
    print("Application shutting down... Stopping background ETL worker.")
    if background_task:
        background_task.cancel()
        try:
            await background_task
        except asyncio.CancelledError:
            print("ETL worker stopped successfully.")

# --- FastAPI Application ---
app = FastAPI(
    title="Mini-ETL Log Dashboard API",
    description="Simulates a log ingestion and processing pipeline.",
    lifespan=lifespan
)

# --- API Endpoints ---

@app.post("/api/log", status_code=202)
async def ingest_log(log: LogMessageIn):
    new_log = LogMessage(**log.model_dump())
    raw_logs_queue.append(new_log)
    return { "status": "log_queued" }

@app.get("/api/stats")
async def get_processed_stats() -> Dict[str, int]:
    stats_to_return = {k: v for k, v in processed_stats.items() if k != "CRITICAL"}
    return stats_to_return

@app.get("/api/queue-status")
async def get_queue_status():
    return {
        "queue_size": len(raw_logs_queue),
        "items": [log.model_dump() for log in raw_logs_queue]
    }

@app.get("/api/dlq-status")
async def get_dlq_status():
    return {
        "queue_size": len(dead_letter_queue),
        "items": [log.model_dump() for log in dead_letter_queue]
    }

@app.get("/api/worker-status")
async def get_worker_status():
    return {"status": "paused" if is_paused else "running"}

@app.post("/api/pause", status_code=202)
async def pause_worker():
    global is_paused
    is_paused = True
    print("[API] Worker PAUSED")
    return {"status": "paused"}

@app.post("/api/resume", status_code=202)
async def resume_worker():
    global is_paused
    is_paused = False
    print("[API] Worker RESUMED")
    return {"status": "running"}