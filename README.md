# ResearchMind 🧠

ResearchMind is a sophisticated, multi-agent artificial intelligence research system. It orchestrates autonomous agents to search, curate, verify, and synthesize knowledge — transforming your queries into structured, publication-ready reports in minutes. 

It also supports **RAG (Retrieval-Augmented Generation)**, allowing you to upload your own PDFs to be used automatically as context by the agents during the writing process.

![ResearchMind UI](https://img.shields.io/badge/UI-Sleek_Dark_Mode-black?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-Python_FastAPI_%7C_LangGraph-blue?style=flat-square)
![DB](https://img.shields.io/badge/Database-MongoDB-green?style=flat-square)

## 🚀 Features

- **Multi-Agent Pipeline**: Utilizes LangGraph to choreograph specialized agents (Searcher, Reader, Writer, Critic).
- **Human-in-the-Loop**: Seamlessly review and approve candidate sources mid-pipeline before allowing the writer to draft the final report.
- **Deep Web Search**: Powered by Tavily advanced search with dynamic query expansion for optimal source retrieval.
- **RAG Context Integration**: Upload PDF documents; the pipeline parses and queries them, injecting your private context to ground the final generated report.
- **Iterative Critic Loop**: A dedicated Critic Agent evaluates the draft against rigorous standards and kicks it back to the Writer for revisions until the score passes the threshold.
- **Search History**: Persisted in MongoDB, easily retrieve past executed research and instantly replay/view the generated reports with a click of a button.
- **Stunning Frontend**: A completely bespoke interface built purely with CSS & Vanilla JS. Includes glassmorphic overlays, SVG animations, and dynamic state transitions without the overhead of heavy SPA frameworks.

## ⚙️ Architecture Workflow

1. **Enhance Topic Node**: An LLM expands a short user topic into a highly detailed research directive.
2. **Search Node**: Performs vector queries against any uploaded PDF RAG contexts, and performs diverse iterations of deep web searches to fetch candidate URLs.
3. **Human Approval Node**: The graph pauses gracefully, awaiting explicit approval of sources via the React-less frontend.
4. **Scrape & Write Node**: Scrapes all approved URLs directly and drafts a dense, ~2000-word graduate-level initial report based strictly on the approved inputs and RAG context.
5. **Critic Node**: Reviews the draft structurally and textually. If the draft scores below the threshold, it is kicked back to the internal writer for revisions.

## 🛠️ Required API Keys
Before running the application, provide your environment variables in a `.env` file at the root:

```env
OPENAI_API_KEY=your_openai_key
TAVILY_API_KEY=your_tavily_key
MONGO_URI=mongodb://localhost:27017
```

## 💻 Running Locally

### Option 1: Docker (Recommended)
You can run the entire application setup, including the MongoDB dependency, utilizing docker-compose.

1. Ensure Docker Desktop is installed and running.
2. Run the application suite:
```bash
docker-compose up --build
```
3. Open `http://localhost:8000` in your browser.

### Option 2: Local Python Environment
If you prefer running natively and already have MongoDB running locally:

1. Install dependencies from `requirements.txt`:
```bash
pip install -r requirements.txt
```
2. Start the FastAPI server:
```bash
python server.py
```
3. Open `http://127.0.0.1:8000/` in your browser.

## 📚 Endpoints Overview

- `POST /api/documents/ingest`: Parses and vectorizes uploaded PDF contexts.
- `POST /api/research/start`: Initiates the LangGraph research pipeline (stops at Human Approval).
- `POST /api/research/continue`: Resumes the graph with user-approved sources and streams generation.
- `GET /api/history`: Retrieves the timeline state of previous researches.
- `GET /api/history/{thread_id}`: Replays a specific research session and final draft.

## 🤝 Contributing
Contributions, issues and feature requests are welcome! 