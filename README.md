# ResearchMind

## Run the integrated frontend + backend

1. Install dependencies from `requirements.txt`.
2. Start the API server with `python server.py`.
3. Open `http://127.0.0.1:8000/` in your browser.

The HTML, CSS, and JavaScript frontend is served by the Python backend and talks to the research graph through `/api/research/start`, `/api/research/continue`, and `/api/documents/ingest`.