import ast
import os
import re
from typing import Dict, List, Optional


JS_TS_BOUNDARY = re.compile(
    r"^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)|"
    r"^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(|"
    r"^(?:export\s+)?(?:default\s+)?class\s+(\w+)",
    re.MULTILINE,
)

JAVA_BOUNDARY = re.compile(
    r"((?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\([^\)]*\)\s*\{)",
    re.MULTILINE,
)


def detect_language(file_path: str, language: Optional[str] = None) -> str:
    if language:
        return language

    name = os.path.basename(file_path)
    lower_path = file_path.lower()

    if lower_path.endswith(".py"):
        return "python"
    if lower_path.endswith((".js", ".jsx")):
        return "javascript"
    if lower_path.endswith((".ts", ".tsx")):
        return "typescript"
    if lower_path.endswith(".java"):
        return "java"
    if lower_path.endswith(".go"):
        return "go"
    if lower_path.endswith(".md"):
        return "markdown"
    if lower_path.endswith((".yaml", ".yml")):
        return "yaml"
    if lower_path.endswith(".json"):
        return "json"
    if name == "Dockerfile":
        return "dockerfile"
    return "plaintext"


def chunk_file(content: str, file_path: str, language: Optional[str] = None) -> List[Dict]:
    detected_language = detect_language(file_path, language)

    if detected_language == "python":
        chunks = _chunk_python(content, detected_language)
    elif detected_language in {"javascript", "typescript"}:
        chunks = _chunk_js_ts(content, detected_language)
    elif detected_language == "java":
        chunks = _chunk_java(content, detected_language)
    elif detected_language == "markdown":
        chunks = _chunk_markdown(content, detected_language)
    elif detected_language in {"yaml", "json"}:
        chunks = [_single_chunk(content, "config", None, None, None, detected_language)]
    else:
        chunks = _chunk_plaintext(content, detected_language)

    filtered = []
    for chunk in chunks:
        if len((chunk.get("content") or "").strip()) >= 50:
            filtered.append(chunk)
    return filtered


def _single_chunk(
    content: str,
    chunk_type: str,
    chunk_name: Optional[str],
    start_line: Optional[int],
    end_line: Optional[int],
    language: str,
) -> Dict:
    return {
        "content": content.strip(),
        "chunk_type": chunk_type,
        "chunk_name": chunk_name,
        "start_line": start_line,
        "end_line": end_line,
        "language": language,
    }


def _chunk_python(content: str, language: str) -> List[Dict]:
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return _chunk_plaintext(content, language)

    lines = content.splitlines()
    chunks = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            start_line = getattr(node, "lineno", None)
            end_line = getattr(node, "end_lineno", None)
            if not start_line or not end_line:
                continue

            snippet = "\n".join(lines[start_line - 1 : end_line])
            chunk_type = "class" if isinstance(node, ast.ClassDef) else "function"
            chunks.append(
                _single_chunk(
                    snippet,
                    chunk_type,
                    getattr(node, "name", None),
                    start_line,
                    end_line,
                    language,
                )
            )

    return chunks or _chunk_plaintext(content, language)


def _chunk_js_ts(content: str, language: str) -> List[Dict]:
    matches = list(JS_TS_BOUNDARY.finditer(content))
    if not matches:
        return _chunk_plaintext(content, language)

    lines = content.splitlines()
    line_offsets = _compute_line_offsets(lines)
    chunks = []

    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(content)
        snippet = content[start:end].strip()
        chunk_name = next((group for group in match.groups() if group), None)
        header = match.group(0)
        chunk_type = "class" if "class " in header else "function"
        start_line = _offset_to_line_number(start, line_offsets)
        end_line = _offset_to_line_number(end, line_offsets)
        chunks.append(
            _single_chunk(snippet, chunk_type, chunk_name, start_line, end_line, language)
        )

    return chunks


def _chunk_java(content: str, language: str) -> List[Dict]:
    matches = list(JAVA_BOUNDARY.finditer(content))
    if not matches:
        return _chunk_plaintext(content, language)

    lines = content.splitlines()
    line_offsets = _compute_line_offsets(lines)
    chunks = []

    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(content)
        snippet = content[start:end].strip()
        header = match.group(1) or ""
        chunk_name = match.group(2)
        chunk_type = "class" if " class " in header else "method"
        start_line = _offset_to_line_number(start, line_offsets)
        end_line = _offset_to_line_number(end, line_offsets)
        chunks.append(
            _single_chunk(snippet, chunk_type, chunk_name, start_line, end_line, language)
        )

    return chunks


def _chunk_markdown(content: str, language: str) -> List[Dict]:
    lines = content.splitlines()
    heading_indexes = [
        index for index, line in enumerate(lines) if line.startswith("## ")
    ]

    if not heading_indexes:
        return _chunk_plaintext(content, language)

    chunks = []
    for index, start_idx in enumerate(heading_indexes):
        end_idx = heading_indexes[index + 1] if index + 1 < len(heading_indexes) else len(lines)
        section_lines = lines[start_idx:end_idx]
        heading_text = lines[start_idx][3:].strip()
        chunks.append(
            _single_chunk(
                "\n".join(section_lines),
                "section",
                heading_text or None,
                start_idx + 1,
                end_idx,
                language,
            )
        )

    return chunks


def _chunk_plaintext(content: str, language: str) -> List[Dict]:
    words = content.split()
    if not words:
        return []

    max_words = 400
    overlap = 50
    chunks = []
    start_word = 0

    while start_word < len(words):
        end_word = min(start_word + max_words, len(words))
        chunk_words = words[start_word:end_word]
        chunk_text = " ".join(chunk_words)
        chunks.append(
            _single_chunk(
                chunk_text,
                "paragraph",
                None,
                None,
                None,
                language,
            )
        )
        if end_word >= len(words):
            break
        start_word = max(end_word - overlap, start_word + 1)

    return chunks


def _compute_line_offsets(lines: List[str]) -> List[int]:
    offsets = []
    current = 0
    for line in lines:
        offsets.append(current)
        current += len(line) + 1
    offsets.append(current)
    return offsets


def _offset_to_line_number(offset: int, line_offsets: List[int]) -> int:
    for index, line_offset in enumerate(line_offsets):
        if line_offset > offset:
            return max(1, index)
    return max(1, len(line_offsets) - 1)
