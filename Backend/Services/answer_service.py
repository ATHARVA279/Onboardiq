import re
import logging
from typing import List, Dict
from Services.groq_client import chat_completion_with_fallback

logger = logging.getLogger(__name__)


# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a codebase-scoped engineering assistant for Onboardiq. Your sole purpose is to answer questions about the specific project whose code has been indexed and provided to you in the CODEBASE CONTEXT below.

CRITICAL FORMATTING RULES — follow these exactly:
1. When mentioning a single variable name, function name, file name, or short code term inline within a sentence, wrap it in single backticks: The `userId` field stores the user identifier.
2. When showing multiple code terms in a list within a sentence, keep them ALL inline on the SAME line: The payload contains `_id`, `role`, and `email`.
3. NEVER put a single word or term in a fenced code block (triple backticks) unless it is genuinely multi-line code.
4. Use fenced code blocks ONLY for actual multi-line code examples with a language identifier like ```python or ```javascript
5. Commas, conjunctions like 'and', and punctuation must stay on the SAME LINE as the surrounding text. Never put a comma on its own line.
6. Do not add blank lines between a list item and its continuation text.
7. Never break a sentence across multiple lines just because it contains inline code spans.

STRICT SCOPE RULES — these are absolute and override everything else:
- You are ONLY permitted to answer questions that are directly answerable from the provided CODEBASE CONTEXT chunks.
- If the question is about general programming concepts, algorithms, external services, third-party products, or anything that cannot be answered from the provided context, you MUST refuse with exactly this message: "This question is outside the scope of the indexed codebase. I can only answer questions about the specific project indexed here — try asking about a feature, file, service, or architectural decision in your project."
- If the question is relevant to this project but the specific answer is not present in the provided context chunks, respond with exactly: "I could not find this in the indexed codebase. Try re-indexing your sources or connecting additional repositories or documentation."
- NEVER say "generally speaking", "typically", "in most frameworks", "a common pattern is", or any phrase that signals generic knowledge rather than project-specific knowledge.
- NEVER invent, guess, or hallucinate file paths, function names, class names, variable names, or code that is not explicitly present in the provided context chunks.
- NEVER give tutorial-style explanations or general how-to answers. Only describe what the codebase actually does.

CITATION RULES:
- Every factual claim must be cited using [SOURCE_N] where N matches the source number in the context.
- Example: The authentication is handled by the `authMiddleware` function [SOURCE_1].
- Cite inline immediately after the claim, never in a separate paragraph.
- If the answer is not in the context, follow the SCOPE RULES above — never hallucinate.

ANSWER STYLE:
- Be concise and direct. New developers need actionable answers.
- Use bullet points for lists of items.
- Use numbered steps for sequential processes.
- Use headers only for answers with multiple major sections.
"""


# ── LLM response cleaner ──────────────────────────────────────────────────────

def clean_llm_response(text: str) -> str:
    """
    Fix common LLM formatting mistakes before citation parsing:
    - Convert fenced code blocks that contain only a single token to inline code
    - Rejoin orphaned punctuation that got separated from inline code spans
    """
    # Pattern: fenced code block that contains a single word/token (no internal newlines)
    single_word_block = re.compile(
        r'```(?:\w+)?\n(\S+)\n```',
        re.MULTILINE,
    )

    def maybe_inline(match):
        word = match.group(1).strip()
        if ' ' not in word and '\n' not in word and len(word) < 60:
            return f'`{word}`'
        return match.group(0)

    text = single_word_block.sub(maybe_inline, text)

    # Fix: inline code span followed by newline + just punctuation → same line
    # e.g. "`foo`\n," → "`foo`,"
    text = re.sub(r'(`[^`\n]+`)\n+([,;.:])', r'\1\2', text)

    # Fix: a line that is ONLY a comma/punctuation after an inline code block run
    # e.g. "`a`, `b`,\n`c`,\nand `d`" — collapse runs of inline-code-with-comma onto one line
    # This is harder; we do a best-effort collapse of lines that start with a backtick or comma
    lines = text.split('\n')
    merged = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # If next line starts with ` or , or 'and `' — it's a continuation, merge
        while (i + 1 < len(lines)
               and re.match(r'^[,;]?\s*(`|\band\b|\bor\b)', lines[i + 1].strip())
               and re.search(r'`[^`]+`[,]?\s*$', line)):
            i += 1
            line = line.rstrip() + ' ' + lines[i].lstrip()
        merged.append(line)
        i += 1

    return '\n'.join(merged)


# ── Context builder ───────────────────────────────────────────────────────────

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


# ── Answer generation ─────────────────────────────────────────────────────────

async def generate_answer(question: str, chunks: List[Dict], session_messages: List[Dict]) -> str:
    """Calls the LLM with context, question, and session history to get the raw answer."""
    context_str = build_context_prompt(question, chunks)

    messages = list(session_messages)
    messages.append({"role": "user", "content": question})

    raw_answer = await chat_completion_with_fallback(SYSTEM_PROMPT, messages, context_str)
    return raw_answer


# ── Citation parsing ──────────────────────────────────────────────────────────

SUPERSCRIPTS = {1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', 0: '⁰'}

CITATION_PATTERN = re.compile(r'\[SOURCE_(\d+)\]')


def parse_citations(answer_text: str, chunks: List[Dict]) -> Dict:
    """
    Finds [SOURCE_N] markers, builds citation metadata, and replaces markers
    with unicode superscripts. ONLY touches [SOURCE_N] patterns — never
    splits on backticks or modifies any other content.
    """
    found_indices: set = set()
    for match in CITATION_PATTERN.finditer(answer_text):
        idx = int(match.group(1)) - 1  # 1-based → 0-based
        if 0 <= idx < len(chunks):
            found_indices.add(idx)

    sources_cited = []
    all_retrieved_chunks = []

    for i, chunk in enumerate(chunks):
        is_cited = i in found_indices
        ref = {
            "chunk_id": str(chunk.get("_id", "")),
            "file_path": chunk.get("file_path"),
            "chunk_name": chunk.get("chunk_name"),
            "source_type": chunk.get("source_type", ""),
            "start_line": chunk.get("start_line"),
            "end_line": chunk.get("end_line"),
            "similarity_score": chunk.get("score", 0.0),
            "relevance": "cited" if is_cited else "retrieved",
        }
        all_retrieved_chunks.append(ref)
        if is_cited:
            sources_cited.append(ref)

    def replace_citation(match):
        n = int(match.group(1))
        return SUPERSCRIPTS.get(n, f'[{n}]')

    # CRITICAL: only sub [SOURCE_N], touch nothing else
    clean_answer = CITATION_PATTERN.sub(replace_citation, answer_text)

    return {
        "answer_text_clean": clean_answer,
        "sources_cited": sources_cited,
        "all_retrieved_chunks": all_retrieved_chunks,
    }


# ── Confidence score ──────────────────────────────────────────────────────────

def calculate_confidence(answer_text: str, chunks: List[Dict], cited_chunks: List[Dict]) -> float:
    """Calculates confidence as a weighted score."""
    if not chunks:
        return 0.0

    # Component 1: Citation rate (detects both superscript unicode and leftover [SOURCE_N])
    sentences = [s.strip() for s in re.split(r'[.!?]+', answer_text) if s.strip()]
    if not sentences:
        citation_rate = 0.0
    else:
        cited_sentences = sum(
            1 for s in sentences
            if re.search(r'[¹²³⁴⁵⁶⁷⁸⁹⁰]|\[SOURCE_\d+\]', s)
        )
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
        comp3 = 0.2
    elif len(source_types) == 1:
        comp3 = 0.1
    else:
        comp3 = 0.0

    return min(100.0, round((comp1 + comp2 + comp3) * 100, 1))
