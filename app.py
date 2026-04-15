import streamlit as st
import time
import os
import uuid
from pymongo import MongoClient
from langgraph.checkpoint.mongodb import MongoDBSaver

from graph import build_graph
from document_store import ingest_pdf, clear_vectorstore
from markdown_pdf import Section, MarkdownPdf

# ── Environment & DB Setup ────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

DB_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

@st.cache_resource
def get_mongo_client():
    # Only establish connection once per session
    client = MongoClient(DB_URI)
    return client

client = get_mongo_client()

@st.cache_resource
def setup_db():
    pass

setup_db()


# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="ResearchMind Advanced",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ── Custom CSS ────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

/* ── Reset & base ── */
html, body, [class*="css"] {
    font-family: 'DM Sans', sans-serif;
    color: #e8e4dc;
}

.stApp {
    background: #0a0a0f;
    background-image:
        radial-gradient(ellipse 80% 50% at 20% -10%, rgba(255,140,50,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 60% 40% at 80% 110%, rgba(255,80,30,0.08) 0%, transparent 55%);
}

#MainMenu, footer, header { visibility: hidden; }
.block-container { padding: 2rem 3rem 4rem; max-width: 1200px; }

/* ── Hero header ── */
.hero { text-align: center; padding: 2rem 0; position: relative; }
.hero-eyebrow {
    font-family: 'DM Mono', monospace; font-size: 0.7rem; font-weight: 500; letter-spacing: 0.25em; text-transform: uppercase; color: #ff8c32; margin-bottom: 1rem; opacity: 0.9;
}
.hero h1 { font-family: 'Syne', sans-serif; font-size: 3rem; font-weight: 800; line-height: 1.0; color: #f0ebe0; margin: 0 0 1rem; }
.hero h1 span { color: #ff8c32; }
.hero-sub { font-size: 1.05rem; font-weight: 300; color: #a09890; max-width: 520px; margin: 0 auto; line-height: 1.65; }

.divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,140,50,0.3), transparent); margin: 1.5rem 0; }
.input-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,140,50,0.15); border-radius: 16px; padding: 2rem; margin-bottom: 1rem; backdrop-filter: blur(8px); }
.stTextInput > div > div > input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,140,50,0.25); border-radius: 10px; color: #f0ebe0; }
.stButton > button { background: linear-gradient(135deg, #ff8c32 0%, #ff5a1a 100%) !important; color: #0a0a0f !important; font-weight: 700; width: 100%; border:none; }

.step-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.5rem; margin-bottom: 1rem; border-left: 3px solid rgba(255,255,255,0.1); }
.step-card.active { border-color: rgba(255,140,50,0.4); background: rgba(255,140,50,0.04); border-left-color: #ff8c32; }
.step-card.done { border-color: rgba(80,200,120,0.3); background: rgba(80,200,120,0.03); border-left-color: #50c878; }

.status-waiting  { color: #555; font-size: 0.8rem; float: right; }
.status-running  { color: #ff8c32; font-size: 0.8rem; float: right; }
.status-done     { color: #50c878; font-size: 0.8rem; float: right; }

.report-panel { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,140,50,0.2); border-radius: 16px; padding: 2rem; margin-top: 1rem; }
.section-heading { font-family: 'Syne', sans-serif; font-size: 1.3rem; font-weight: 700; color: #f0ebe0; margin: 1rem 0; }
</style>
""", unsafe_allow_html=True)


# ── Session State Init ────────────────────────────────────────────────────────
if "thread_id" not in st.session_state:
    st.session_state.thread_id = str(uuid.uuid4())
if "graph_state" not in st.session_state:
    st.session_state.graph_state = "waiting" # waiting, searching, approval, writing, done
if "current_step" not in st.session_state:
    st.session_state.current_step = None


# ── Sidebar RAG Uploader ──────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 📚 Upload Context (RAG)")
    st.markdown("Provide PDFs to inform the research.")
    uploaded_files = st.file_uploader("Upload PDFs", type="pdf", accept_multiple_files=True)
    if st.button("Process Documents"):
        if uploaded_files:
            with st.spinner("Processing..."):
                clear_vectorstore() # ephemeral
                for uf in uploaded_files:
                    res = ingest_pdf(uf.read(), uf.name)
                    st.success(res)
        else:
            st.warning("Please upload a file first.")
            

# ── Hero ──────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero">
    <div class="hero-eyebrow">Advanced Multi-Agent System</div>
    <h1>Research<span>Mind</span> PRO</h1>
    <p class="hero-sub">Deep Research, RAG, HITL & PostgreSQL Persistence</p>
</div>
""", unsafe_allow_html=True)

builder = build_graph()


# ── Graph Runner ─────────────────────────────────────────────────────────────
def run_graph_until_interrupt(topic: str):
    """Executes the LangGraph until human interrupt or completion."""
    checkpointer = MongoDBSaver(client)
    graph = builder.compile(checkpointer=checkpointer, interrupt_before=["human_approval"])
    config = {"configurable": {"thread_id": st.session_state.thread_id}}
        
    # Determine if we are starting fresh or resuming
    current_state = graph.get_state(config)
    if current_state.next:
        st.session_state.graph_state = "approval"
        return current_state
        
    with st.spinner("🔍 Agent is conducting Deep Research..."):
        try:
            for event in graph.stream({"topic": topic}, config):
                pass
        except Exception as e:
            st.error(f"Error during graph execution: {e}")
            
    new_state = graph.get_state(config)
    if "human_approval" in new_state.next:
        st.session_state.graph_state = "approval"
    else:
        st.session_state.graph_state = "done"

def resume_graph_from_interrupt(approved_urls: list):
    """Resumes the LangGraph past the HITL node."""
    checkpointer = MongoDBSaver(client)
    graph = builder.compile(checkpointer=checkpointer, interrupt_before=["human_approval"])
    config = {"configurable": {"thread_id": st.session_state.thread_id}}
        
    # Inject user decisions into state and pretend we ARE the human_approval node
    graph.update_state(config, {"approved_urls": approved_urls}, as_node="human_approval")
    
    with st.spinner("✍️ Agents are scraping and writing report (Refining...)..."):
        try:
            for event in graph.stream(None, config):
                # Watch iterations
                if "critic" in event:
                    st.toast(f"Critic Score: {event['critic']['critic_score']}/10. Revision: {graph.get_state(config).values.get('revision_count', 0)}")
        except Exception as e:
            st.error(f"🛑 Error during Agent execution: {str(e)}")
                
    st.session_state.graph_state = "done"


# ── Layout ───────────────────────────────────────────────────────────────────
col_input, col_spacer, col_pipeline = st.columns([5, 0.5, 4])

with col_input:
    st.markdown('<div class="input-card">', unsafe_allow_html=True)
    topic = st.text_input("Research Topic", key="topic_input", placeholder="e.g. Advancements in RAG")
    
    if st.button("⚡ Start Advanced Research Protocol"):
        if topic.strip():
            # Reset session
            st.session_state.thread_id = str(uuid.uuid4())
            st.session_state.graph_state = "searching"
            run_graph_until_interrupt(topic)
            st.rerun()
        else:
            st.warning("Please enter a topic.")
    st.markdown('</div>', unsafe_allow_html=True)
    
    # ── HITL UI (Approval) ──
    if st.session_state.graph_state == "approval":
        st.markdown("### 🛑 Human in the Loop")
        st.info("The Search Agent has found candidate sources. Please select the ones you want to include in your research.")
        
        checkpointer = MongoDBSaver(client)
        graph = builder.compile(checkpointer=checkpointer, interrupt_before=["human_approval"])
        config = {"configurable": {"thread_id": st.session_state.thread_id}}
        ss = graph.get_state(config)
            
        candidates = ss.values.get("candidate_urls", [])
        
        with st.form("approval_form"):
            selected_urls = []
            for url in candidates:
                if st.checkbox(url, value=True):
                    selected_urls.append(url)
            
            if st.form_submit_button("Approve & Continue"):
                resume_graph_from_interrupt(selected_urls)
                st.rerun()

with col_pipeline:
    st.markdown('<div class="section-heading">Pipeline Status</div>', unsafe_allow_html=True)
    
    gs = st.session_state.graph_state
    def get_status(step):
        if gs == "waiting": return "waiting"
        if gs == "done": return "done"
        if step == "search":
            return "running" if gs == "searching" else "done"
        if step == "approval":
            return "running" if gs == "approval" else ("waiting" if gs == "searching" else "done")
        if step == "writer":
            return "running" if gs == "writing" else ("waiting" if gs in ["waiting", "searching", "approval"] else "done")

    def card(num, title, state_key, desc):
        state = get_status(state_key)
        cls = "active" if state == "running" else ("done" if state == "done" else "")
        lbl = "● RUNNING" if state=="running" else ("✓ DONE" if state=="done" else "WAITING")
        st.markdown(f"""
        <div class="step-card {cls}">
            <strong>{num} - {title}</strong>
            <span class="status-{state}">{lbl}</span>
            <div style="font-size: 0.8rem; color: #a09890; margin-top: 5px;">{desc}</div>
        </div>
        """, unsafe_allow_html=True)
        
    card("01", "Deep Search & RAG", "search", "Tavily Graph Node + ChromaDB")
    card("02", "Human Approval", "approval", "UI Interrupt & Selection")
    card("03", "Scrape, Write & Critic Loop", "writer", "Self-Correcting LLM loops")


# ── Results & Export ─────────────────────────────────────────────────────────
if st.session_state.graph_state == "done":
    st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
    
    checkpointer = MongoDBSaver(client)
    graph = builder.compile(checkpointer=checkpointer, interrupt_before=["human_approval"])
    config = {"configurable": {"thread_id": st.session_state.thread_id}}
    final_state = graph.get_state(config)
    report = final_state.values.get("draft_report", "No report generated.")
        
    st.markdown('<div class="section-heading">Final Research Report</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="report-panel">{report}</div>', unsafe_allow_html=True)
    
    # Generate PDF
    def create_pdf(text):
        try:
            pdf = MarkdownPdf(toc_level=2)
            pdf.add_section(Section(text))
            file_path = "research_report.pdf"
            pdf.save(file_path)
            return file_path
        except Exception as e:
            return None
            
    pdf_path = create_pdf(report)
        
    st.markdown("<br>", unsafe_allow_html=True)
    col1, col2 = st.columns(2)
    with col1:
        st.download_button("⬇ Download Markdown", report, file_name="report.md")
    with col2:
        if pdf_path and os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                st.download_button("⬇ Download PDF", f, file_name="report.pdf", mime="application/pdf")
        else:
            st.warning("PDF Generation unavailable (requires markdown-pdf dependencies). You can still download the Markdown.")