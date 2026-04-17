from __future__ import annotations

import datetime
import os
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from langgraph.checkpoint.mongodb import MongoDBSaver
from pydantic import BaseModel
from pymongo import MongoClient

from document_store import ingest_pdf
from graph import build_graph


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DB_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")


app = FastAPI(title="ResearchMind API")

def get_mongo_client():
    # Only establish connection once per session
    try:
        client = MongoClient(DB_URI, serverSelectionTimeoutMS=5000)
        # Force a call to check if connection is really established
        client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
        return client
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return None

client = get_mongo_client()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/assets", StaticFiles(directory=BASE_DIR), name="assets")


@app.get("/", include_in_schema=False)
def home() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


class StartResearchRequest(BaseModel):
    topic: str
    search_depth: str = "standard"
    max_sources: int = 10


class ContinueResearchRequest(BaseModel):
    thread_id: str
    approved_urls: list[str] = []


def get_client() -> MongoClient:
    return MongoClient(DB_URI)


def build_graph_runtime():
    client = get_client()
    checkpointer = MongoDBSaver(client)
    return build_graph().compile(checkpointer=checkpointer, interrupt_before=["human_approval"])


def build_source_cards(search_results: str, candidate_urls: list[str]) -> list[dict[str, Any]]:
    blocks = [block.strip() for block in search_results.split("----") if block.strip()]
    cards: list[dict[str, Any]] = []

    for index, block in enumerate(blocks):
        title = "Untitled Source"
        url = candidate_urls[index] if index < len(candidate_urls) else ""
        snippet = ""

        for line in block.splitlines():
            line = line.strip()
            if line.startswith("Title:"):
                title = line.replace("Title:", "", 1).strip() or title
            elif line.startswith("URL:"):
                url = line.replace("URL:", "", 1).strip() or url
            elif line.startswith("Snippet:"):
                snippet = line.replace("Snippet:", "", 1).strip()

        domain = urlparse(url).netloc.replace("www.", "") if url else "source"

        cards.append(
            {
                "id": index + 1,
                "title": title,
                "url": url,
                "snippet": snippet,
                "domain": domain,
                "type": "Web source",
                "relevance": "high" if index < 3 else "mid",
                "selected": True,
            }
        )

    if not cards:
        for index, url in enumerate(candidate_urls):
            cards.append(
                {
                    "id": index + 1,
                    "title": url,
                    "url": url,
                    "snippet": "",
                    "domain": urlparse(url).netloc.replace("www.", "") if url else "source",
                    "type": "Web source",
                    "relevance": "mid",
                    "selected": True,
                }
            )

    return cards


@app.post("/api/documents/ingest")
async def ingest_documents(files: list[UploadFile] = File(default=[])) -> dict[str, Any]:
    if not files:
        return {"ingested": [], "message": "No files uploaded."}

    results: list[dict[str, str]] = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            continue

        content = await file.read()
        result = ingest_pdf(content, file.filename)
        results.append({"file": file.filename, "result": result})

    return {"ingested": results}


@app.post("/api/research/start")
def start_research(payload: StartResearchRequest) -> dict[str, Any]:
    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required.")

    print("\n" + "="*50)
    print(f"🔥 INCOMING REQUEST: {topic}")
    print(f"📦 MAX SOURCES: {payload.max_sources} (Type: {type(payload.max_sources)})")
    print(f"🔍 SEARCH DEPTH: {payload.search_depth}")
    print("="*50 + "\n")

    thread_id = str(uuid.uuid4())
    
    db = get_client()["research_mind"]
    db["history"].insert_one({
        "thread_id": thread_id,
        "topic": topic,
        "status": "In Progress",
        "created_at": datetime.datetime.now(datetime.timezone.utc),
        "draft_report": ""
    })

    graph = build_graph_runtime()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        for _ in graph.stream({
            "topic": topic,
            "search_depth": payload.search_depth,
            "max_sources": int(payload.max_sources)
        }, config):
            pass
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Research start failed: {exc}") from exc

    state = graph.get_state(config)
    values = state.values if state else {}
    candidate_urls = values.get("candidate_urls", []) or []
    search_results = values.get("search_results", "") or ""

    return {
        "thread_id": thread_id,
        "research_directive": values.get("research_directive", topic),
        "rag_context": values.get("rag_context", ""),
        "search_results": search_results,
        "candidate_urls": candidate_urls,
        "candidate_sources": build_source_cards(search_results, candidate_urls),
    }


@app.post("/api/research/continue")
def continue_research(payload: ContinueResearchRequest) -> dict[str, Any]:
    if not payload.thread_id.strip():
        raise HTTPException(status_code=400, detail="thread_id is required.")

    graph = build_graph_runtime()
    config = {"configurable": {"thread_id": payload.thread_id}}

    try:
        graph.update_state(config, {"approved_urls": payload.approved_urls}, as_node="human_approval")
        for _ in graph.stream(None, config):
            pass
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Research continuation failed: {exc}") from exc

    state = graph.get_state(config)
    values = state.values if state else {}

    draft_report = values.get("draft_report", "No report generated.")
    
    db = get_client()["research_mind"]
    db["history"].update_one(
        {"thread_id": payload.thread_id},
        {"$set": {
            "status": "Completed",
            "draft_report": draft_report
        }}
    )

    return {
        "thread_id": payload.thread_id,
        "draft_report": draft_report,
        "critic_score": values.get("critic_score", 0),
        "critic_feedback": values.get("critic_feedback", ""),
        "revision_count": values.get("revision_count", 0),
    }

@app.get("/api/history")
def get_history() -> dict[str, Any]:
    db = get_client()["research_mind"]
    cursor = db["history"].find({}, {"_id": 0}).sort("created_at", -1)
    history_list = list(cursor)
    for item in history_list:
        if "created_at" in item and item["created_at"]:
            item["created_at"] = item["created_at"].isoformat()
    return {"history": history_list}

@app.get("/api/history/{thread_id}")
def get_history_item(thread_id: str) -> dict[str, Any]:
    db = get_client()["research_mind"]
    item = db["history"].find_one({"thread_id": thread_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="History not found")
    if "created_at" in item and item["created_at"]:
        item["created_at"] = item["created_at"].isoformat()
    return item


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)