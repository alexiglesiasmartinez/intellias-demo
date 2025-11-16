# Mini-ETL Log Dashboard (Technical Demo)

This is a full-stack technical demo simulating a modern, asynchronous, and resilient data processing pipeline.

The project demonstrates a decoupled architecture where log "producers" (the frontend) are fully independent of log "consumers" (the backend worker). This pattern is fundamental for building scalable, high-volume systems.

The entire environment is containerized with Docker and runs with a single command.



## Core Concepts Demonstrated

This demo is designed to showcase several senior-level engineering concepts:

* **Asynchronous Processing:** The backend worker processes jobs from a queue independently of the API requests, simulating a non-blocking system.
* **Decoupled Architecture (Producer/Consumer):** The React frontend (Producer) only submits jobs to a queue. The FastAPI worker (Consumer) processes them. They do not communicate directly.
* **System Resilience (Dead-Letter Queue):** The worker can identify "poison pill" messages (the `CRITICAL` log) and move them to a Dead-Letter Queue (DLQ) for manual inspection, preventing a system-wide crash.
* **Observability & Monitoring:** The dashboard provides a real-time view into the *state* of the system, including the number of unprocessed items in the main queue and the number of failed jobs in the DLQ.
* **Runtime Control:** The system allows an "operator" to pause and resume the ETL worker at runtime, demonstrating stateful control over a background service.
* **Full-Stack Containerization:** The entire application (React frontend, FastAPI backend, and Python environment) is defined in a single `docker-compose.yml` file for perfect reproducibility.
* **Test-Driven Development (TDD):** The backend's complex logic (pause, resume, DLQ) is fully validated by a `pytest` suite, ensuring reliability.

## Tech Stack

* **Backend:** FastAPI, Pydantic, Uvicorn, `asyncio`
* **Frontend:** React, Vite, `styled-components`, `recharts`, `framer-motion`
* **Testing:** `pytest`, `anyio`, `httpx` (via `TestClient`)
* **DevOps:** Docker, Docker Compose

---

## 1. How to Run the Demo

**Prerequisites:**
* Docker
* Docker Compose

**Running the Application:**

1.  Clone this repository (or ensure you have all files).
2.  From the project's root directory, build and run the containers:
    ```bash
    docker compose up --build
    ```
3.  Open your browser and navigate to:
    **`http://localhost:5173`**

---

## 2. The Demo "Story" (How to Use)

This demo tells a story about a data pipeline. Follow these steps to see all features:

1.  **Page Load:** The page loads with a staggered "spring" animation.
2.  **Pause the Worker:** Click the **"Pause Worker"** button. The status light will turn red and start pulsing.
3.  **Buffer the Queue:** Click **"Simulate INFO"** and **"Simulate WARNING"** 5-6 times each.
    * **Observe:** The "Unprocessed Logs in Queue" panel fills up with icons. The "Processed" chart remains at 0. This proves the worker is paused and the queue is buffering the load.
4.  **Resume the Worker:** Click **"Resume Worker"**.
    * **Observe:** The "Unprocessed" queue begins to empty, one icon at a time (at the 2-second processing interval). Simultaneously, the "Processed Logs" chart begins to update. This visually demonstrates the consumer processing the backlog.
5.  **Simulate a Failure:** Click **"Simulate CRITICAL (Fail)"**.
    * **Observe:** An icon appears in the "Unprocessed" queue, then vanishes. It **does not** appear on the "Processed" chart. Instead, it reappears in the **"Dead-Letter Queue (Failed)"** panel. This proves the worker correctly identified a "poison pill" and segregated it without crashing.

---

## 3. How to Run the Tests

To validate the backend logic, you can run the full `pytest` suite.

1.  If the application is running, stop it (`Ctrl+C`).
2.  Rebuild the backend image to ensure all test dependencies are present:
    ```bash
    docker compose build backend
    ```
3.  Run the tests using `python -m pytest`:
    ```bash
    docker compose run --rm backend python -m pytest
    ```
4.  You will see the output for all 8 test cases (4 tests x 2 async backends) passing.

### What the Tests Validate:

* `test_log_ingestion`: Ensures a log is correctly accepted and queued.
* `test_worker_processing_success`: Ensures a valid log is processed and updates the stats.
* `test_worker_dlq_failure`: Ensures a `CRITICAL` log is correctly moved to the DLQ.
* `test_worker_pause_and_resume`: A critical test that confirms the worker stops processing when paused and correctly clears the backlog when resumed.