import re
from typing import List, Dict, Tuple
from Services.gemini_client import chat_completion

def build_context_prompt(question: str, chunks: List[Dict]) -> str:
    """Builds the structured context string from retrieved chunks."""
    
    code_chunks = []
    doc_chunks = []
    config_chunks = []
    
    for idx, chunk in enumerate(chunks, 1):
        chunk["source_label"] = f"SOURCE_{idx}"
        ctype = chunk.get("chunk_type", "")
        if chunk.get("source_type") == "github_code" or ctype in ["function", "class", "method"]:
            code_chunks.append((idx, chunk))
        elif chunk.get("source_type") == "github_config" or ctype == "config":
            config_chunks.append((idx, chunk))
        else:
            doc_chunks.append((idx, chunk))
            
    context = "CODEBASE CONTEXT:\n"
    
    if code_chunks:
        context += "\n=== CODE FILES ===\n"
        for idx, chunk in code_chunks:
            path = chunk.get("file_path") or chunk.get("url") or "unknown_path"
            lang = chunk.get("language") or "unknown"
            start_line = chunk.get("start_line")
            end_line = chunk.get("end_line")
            
            meta = f"path: {path} | lang: {lang}"
            if start_line is not None and end_line is not None:
                meta += f" | lines: {start_line}-{end_line}"
                
            context += f"[SOURCE_{idx} | {meta}]\n{chunk.get('content', '')}\n\n"
            
    if doc_chunks:
        context += "=== DOCUMENTATION ===\n"
        for idx, chunk in doc_chunks:
            path = chunk.get("file_path") or chunk.get("url") or "unknown_path"
            meta = f"path: {path}"
            if chunk.get("chunk_name"):
                meta += f" | section: {chunk.get('chunk_name')}"
                
            context += f"[SOURCE_{idx} | {meta}]\n{chunk.get('content', '')}\n\n"
            
    if config_chunks:
        context += "=== CONFIGURATION ===\n"
        for idx, chunk in config_chunks:
            path = chunk.get("file_path") or chunk.get("url") or "unknown_path"
            context += f"[SOURCE_{idx} | path: {path}]\n{chunk.get('content', '')}\n\n"
            
    return context


async def generate_answer(question: str, chunks: List[Dict], session_messages: List[Dict]) -> str:
    """Calls Gemini with context, question, and session history to get the raw answer."""
    context_str = build_context_prompt(question, chunks)
    
    system_prompt = """You are an expert engineering assistant for this specific codebase. Your job is to help new developers understand how the codebase works.

Rules you must follow:
1. Only answer based on the provided context. If the answer is not in the context say "I could not find information about this in the indexed codebase" and suggest what to search for instead.
2. Every factual claim must be cited using the format [SOURCE_N] where N matches the source labels in the context.
3. You can cite multiple sources for one claim like [SOURCE_1][SOURCE_3].
4. Never hallucinate code, function names, or file paths. Only reference what is in the context.
5. Format your answer in markdown. Use code blocks for any code examples, using the correct language identifier.
6. Be concise but complete. A new developer should be able to act on your answer immediately."""

    # Add the current question to the end of messages
    messages = list(session_messages)
    messages.append({"role": "user", "content": question})
    
    raw_answer = await chat_completion(system_prompt, messages, context_str)
    return raw_answer

def parse_citations(answer_text: str, chunks: List[Dict]) -> Dict:
    """Parses [SOURCE_N] patterns and builds citations metadata."""
    
    pattern = r'\[SOURCE_(\d+)\]'
    matches = re.finditer(pattern, answer_text)
    
    cited_indices = set()
    for match in matches:
        idx = int(match.group(1))
        # 1-indexed to 0-indexed
        if 1 <= idx <= len(chunks):
            cited_indices.add(idx - 1)
            
    sources_cited = []
    all_retrieved_chunks = []
    
    for i, chunk in enumerate(chunks):
        is_cited = i in cited_indices
        relevance = 'cited' if is_cited else 'retrieved'
        
        citation_info = {
            "chunk_id": str(chunk.get("_id")),
            "file_path": chunk.get("file_path"),
            "chunk_name": chunk.get("chunk_name"),
            "source_type": chunk.get("source_type"),
            "start_line": chunk.get("start_line"),
            "end_line": chunk.get("end_line"),
            "similarity_score": chunk.get("score", 0),
            "relevance": relevance
        }
        
        all_retrieved_chunks.append(citation_info)
        if is_cited:
            sources_cited.append(citation_info)
            
    # Clean answer text replacing [SOURCE_N] with [^N]
    clean_text = answer_text
    # We will sort the matched indices to replace them cleanly
    unique_matches = sorted(list(set([int(m.group(1)) for m in re.finditer(pattern, answer_text)])))
    for idx in unique_matches:
        clean_text = clean_text.replace(f"[SOURCE_{idx}]", f"[^{idx}]")
        
    return {
        "answer_text_clean": clean_text,
        "sources_cited": sources_cited,
        "all_retrieved_chunks": all_retrieved_chunks
    }


def calculate_confidence(answer_text: str, chunks: List[Dict], cited_chunks: List[Dict]) -> float:
    """Calculates confidence as a weighted score."""
    if not chunks:
        return 0.0
        
    # Component 1: Citation rate
    sentences = [s.strip() for s in re.split(r'[.!?]+', answer_text) if s.strip()]
    if not sentences:
        citation_rate = 0.0
    else:
        cited_sentences = sum(1 for s in sentences if re.search(r'\[\^\d+\]|\[SOURCE_\d+\]', s))
        citation_rate = cited_sentences / len(sentences)
        
    comp1 = citation_rate * 0.4
    
    # Component 2: Avg similarity score
    if cited_chunks:
        avg_score = sum(c.get("similarity_score", 0) for c in cited_chunks) / len(cited_chunks)
    else:
        avg_score = sum(c.get("score", 0) for c in chunks) / len(chunks)
        
    comp2 = avg_score * 0.4
    
    # Component 3: Source diversity
    source_types = set(c.get("source_type") for c in cited_chunks if c.get("source_type"))
    if len(source_types) > 1:
        comp3 = 1.0 * 0.2
    elif len(source_types) == 1:
        comp3 = 0.5 * 0.2
    else:
        comp3 = 0.0
        
    total_score = (comp1 + comp2 + comp3) * 100
    return min(100.0, round(total_score, 1))
