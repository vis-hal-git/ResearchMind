import operator
from typing import Annotated, List, Dict, Any, TypedDict
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.graph import StateGraph, END
import json
from document_store import query_documents
from tools import web_search, scrape_url

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.5)
writer_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.5) # Using mini to prevent RateLimit errors on free tier

class ResearchState(TypedDict):
    topic: str
    research_directive: str
    rag_context: str
    search_results: str
    candidate_urls: List[str]
    approved_urls: List[str]
    scraped_content: str
    draft_report: str
    critic_score: int
    critic_feedback: str
    revision_count: int

def enhance_topic_node(state: ResearchState) -> dict:
    """Enhances the user's raw topic into a detailed research query."""
    raw_topic = state['topic']
    
    # Only enhance if it's the first run (revision_count == 0 to prevent loops)
    if state.get("revision_count", 0) > 0:
        return {}
        
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert research prompt engineer. Your job is to take a short user topic and expand it into a highly detailed, extremely specific research directive. Do not add conversational filler. Just return the enhanced prompt."),
        ("human", "Enhance this topic: {topic}")
    ])
    
    chain = prompt | llm | StrOutputParser()
    enhanced = chain.invoke({"topic": raw_topic})
    
    try:
        import streamlit as st
        st.toast(f"✨ LLM Expanded Query: {enhanced[:100]}...")
    except ImportError:
        pass
        
    return {"research_directive": enhanced}

def search_node(state: ResearchState) -> dict:
    """Performs RAG query and Web search, extracting candidate URLs."""
    topic = state['topic']
    
    # 1. RAG query
    rag_ctx = query_documents(topic, k=3)
    
    # 2. Web search using Tavily. 
    # We call the tool function directly.
    # web_search returns a string of formatted results.
    # We will also use TavilyClient directly to easily get raw URLs.
    from tools import tavily
    tavily_results = tavily.search(query=topic, max_results=5)
    
    search_text_out = []
    urls = []
    for r in tavily_results.get('results', []):
        urls.append(r['url'])
        search_text_out.append(f"Title: {r['title']}\nURL: {r['url']}\nSnippet: {r['content'][:300]}")
        
    search_results_str = "\n----\n".join(search_text_out)
    
    return {
        "rag_context": rag_ctx,
        "search_results": search_results_str,
        "candidate_urls": urls,
        "revision_count": 0
    }

def human_approval_node(state: ResearchState) -> dict:
    """
    This is a dummy node. 
    The graph will be set to interrupt BEFORE this node.
    When resumed, the Streamlit app will inject 'approved_urls' into the state.
    """
    # Simply return the state. 
    # Streamlit injects approved_urls using graph.update_state()
    return {}

def reader_node(state: ResearchState) -> dict:
    """Scrapes all approved URLs."""
    urls = state.get('approved_urls', [])
    if not urls:
        return {"scraped_content": "No URLs were approved for scraping."}
        
    scraped = []
    for u in urls:
        # call the underlying func, not the tool invoke
        content = scrape_url.func(u) if hasattr(scrape_url, 'func') else scrape_url(u)
        scraped.append(f"--- CONTENT FROM {u} ---\n{content}\n")
        
    return {"scraped_content": "\n".join(scraped)}

def writer_node(state: ResearchState) -> dict:
    """Drafts a highly detailed, dense research report (~2000 words)."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", 
         "You are an expert research analyst and technical writer. "
         "You produce dense, insight-rich, graduate-level research reports with deep explanations, "
         "not summaries. Every point must be elaborated with reasoning, examples, and context."
        ),

        ("human", """
Write a **highly detailed, deeply analytical research report (~1800–2000 words MAX)**.

Directive:
{research_directive}

Previous Feedback:
{critic_feedback}

RAG Context:
{rag_context}

Search Results:
{search_results}

Scraped Content:
{scraped_content}

========================
STRICT WRITING RULES
========================
1. TOTAL LENGTH: 1800–2000 words (DO NOT EXCEED).
2. DEPTH OVER BREADTH:
   - Do NOT list short bullet points.
   - EVERY bullet must be expanded into **3–6 sentences minimum**.
3. NO SHALLOW CONTENT:
   - Avoid generic statements.
   - Include reasoning, mechanisms, cause-effect, and implications.
4. USE STRUCTURED PARAGRAPHS:
   - Each subsection should contain **multiple dense paragraphs**.
5. TECHNICAL RIGOR:
   - Include frameworks, real-world examples, systems, or mechanisms where relevant.
6. CRITICAL THINKING:
   - Add analysis, trade-offs, contradictions, or limitations.
7. REMOVE FILLER:
   - No vague phrases like "important", "various", "many factors".
   - Be precise and data-oriented where possible.

========================
MANDATORY STRUCTURE
========================

# Title

## Executive Summary (200–250 words)
- Provide a concise but information-dense overview of the entire report.
- Include key arguments, findings, and implications.

## In-Depth Analysis & Key Findings (1000–1200 words)
- Break into multiple **clearly labeled subsections**.
- Each subsection must:
  - Start with a strong conceptual explanation.
  - Follow with detailed elaboration.
  - Include real-world examples, systems, or evidence where possible.
- If using bullet points:
  - Each bullet MUST be expanded into a mini-paragraph (3–6 sentences).
- Include:
  - Historical / technical background (if relevant)
  - Mechanisms / processes
  - Comparative analysis
  - Risks / limitations

## Architectural or Conceptual Visuals
- Provide a **mermaid diagram** if helpful.
- Ensure it reflects actual structure (not decorative).

## Practical Implications / Future Outlook (300–400 words)
- Discuss:
  - Real-world impact
  - Strategic implications
  - Future developments
  - Risks and opportunities
- Must be analytical, not speculative fluff.

## Comprehensive Conclusion (200–250 words)
- Synthesize insights (NOT repeat summary).
- Highlight key takeaways + deeper meaning.

## Sources
- List all URLs used.

========================
QUALITY ENFORCEMENT
========================
- Convert ALL short points into detailed explanations.
- Avoid compressed bullets like in PDFs.
- Each idea must feel like a **fully explained concept**, not a note.

========================
FINAL INSTRUCTION
========================
Produce a **dense, professional, research-grade document close to 2000 words**.
Do NOT produce a short or surface-level report.
""")
    ])
    
    chain = prompt | writer_llm | StrOutputParser()
    
    draft = chain.invoke({
        "research_directive": state.get("research_directive", state["topic"]),
        "critic_feedback": state.get("critic_feedback", "None"),
        "rag_context": state.get("rag_context", "None"),
        "search_results": state.get("search_results", "None"),
        "scraped_content": state.get("scraped_content", "None"),
    })
    
    rev_count = state.get("revision_count", 0) + 1
    
    return {
        "draft_report": draft,
        "revision_count": rev_count
    }

def critic_node(state: ResearchState) -> dict:
    """Evaluates the report."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a sharp research critic. Evaluate the report strictly. You MUST return JSON."),
        ("human", """Review this report on '{topic}':

{report}

Return ONLY a JSON object with two keys:
1. "score": an integer from 1 to 10.
2. "feedback": a string with strengths and weaknesses.
""")
    ])
    
    # We use JSON mode if model supports it, or just parse text
    chain = prompt | llm | StrOutputParser()
    resp = chain.invoke({
        "topic": state["topic"],
        "report": state["draft_report"]
    })
    
    try:
        # Very naive json extraction
        import re
        match = re.search(r'\{.*\}', resp.replace('\n', ''))
        if match:
            data = json.loads(match.group(0))
        else:
            data = json.loads(resp)
        score = int(data.get("score", 5))
        feedback = data.get("feedback", resp)
    except:
        score = 5
        feedback = "Could not parse JSON. Please improve the report structure."

    return {
        "critic_score": score,
        "critic_feedback": feedback
    }

def should_loop(state: ResearchState) -> str:
    """Conditional router based on critic score."""
    score = state.get("critic_score", 0)
    rev_count = state.get("revision_count", 0)
    
    if score >= 8 or rev_count >= 3:
        return END
    else:
        return "writer"

def build_graph():
    builder = StateGraph(ResearchState)
    
    builder.add_node("enhance_topic", enhance_topic_node)
    builder.add_node("search", search_node)
    builder.add_node("human_approval", human_approval_node)
    builder.add_node("reader", reader_node)
    builder.add_node("writer", writer_node)
    builder.add_node("critic", critic_node)
    
    builder.set_entry_point("enhance_topic")
    builder.add_edge("enhance_topic", "search")
    builder.add_edge("search", "human_approval")
    builder.add_edge("human_approval", "reader")
    builder.add_edge("reader", "writer")
    builder.add_edge("writer", "critic")
    builder.add_conditional_edges("critic", should_loop)
    
    return builder
