import os
import tempfile
from typing import List, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

# Maintain a global or module-level vectorstore that is ephemeral
_ephemeral_vectorstore: Optional[Chroma] = None

def get_vectorstore() -> Chroma:
    """Returns the ephemeral vectorstore. Initializes it if it doesn't exist."""
    global _ephemeral_vectorstore
    if _ephemeral_vectorstore is None:
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        # Chroma will run entirely in memory
        _ephemeral_vectorstore = Chroma(
            collection_name="research_docs",
            embedding_function=embeddings,
        )
    return _ephemeral_vectorstore

def ingest_pdf(uploaded_file_bytes: bytes, filename: str) -> str:
    """
    Saves an uploaded PDF to a temporary file, loads it, splits it,
    and adds it to the ephemeral vectorstore.
    """
    import tempfile
    
    # Save uploaded file to temp file
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, filename)
    with open(temp_path, "wb") as f:
        f.write(uploaded_file_bytes)
        
    try:
        loader = PyPDFLoader(temp_path)
        docs = loader.load_and_split()
        
        vectorstore = get_vectorstore()
        vectorstore.add_documents(docs)
        
        return f"Successfully ingested {len(docs)} chunks from {filename}."
    except Exception as e:
        return f"Error ingesting PDF: {str(e)}"
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

def query_documents(query: str, k: int = 3) -> str:
    """
    Queries the ephemeral vectorstore.
    Returns concatenated content of the top k matches, or empty string if no docs.
    """
    vectorstore = get_vectorstore()
    
    # Check if we have any documents in the collection
    count = vectorstore._collection.count()
    if count == 0:
        return ""
        
    results = vectorstore.similarity_search(query, k=k)
    
    out = []
    for doc in results:
        out.append(doc.page_content)
        
    return "\n\n---\n\n".join(out)

def clear_vectorstore():
    """Clears the ephemeral vectorstore."""
    global _ephemeral_vectorstore
    _ephemeral_vectorstore = None
