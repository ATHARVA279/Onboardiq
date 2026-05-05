import google.generativeai as genai
from typing import List

from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)

MODEL = Config.GEMINI_MODEL

def _call_gemini_direct(model, prompt: str) -> str:
    response = model.generate_content(prompt)
    return response.text if hasattr(response, "text") else str(response)

def _truncate_text(text: str, limit: int = 50000) -> str:
    return text if len(text) <= limit else text[:limit]

def ask_question_about_text(question: str, text: str, history: List[dict] = None) -> str:
    history = history or []
    ctx = _truncate_text(text, Config.MAX_TEXT_LENGTH_QA)
    convo_hint = ""
    if history:
        convo_hint += "Conversation history:\n"
        for msg in history[-6:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            convo_hint += f"{role}: {content}\n"

    prompt = f"""
You are an intelligent assistant with expertise in explaining concepts clearly.

PRIORITY: Use the document context below to answer questions when relevant information is available.

Document context:
{ctx}

{convo_hint}

INSTRUCTIONS:
1. If the question is directly answerable from the document context, use that information as your primary source.
2. If the question is related to the document's topic but asks for comparisons, alternatives, or broader context (e.g., "does Python have hooks?" when document is about React hooks), you can use your general knowledge to provide a helpful comparison or explanation while noting it's not in the original material.
3. Keep answers concise (50-200 words) but informative.
4. If asked about something completely unrelated to the document, politely redirect to the document's topic.
5. IMPORTANT: Do NOT use markdown formatting in your response. Avoid using backticks (`), asterisks (*), or other markdown syntax. Write in plain text only.

Question: {question}

Answer:
    """

    model = genai.GenerativeModel(MODEL)
    try:
        raw = _call_gemini_direct(model, prompt)
    except Exception as e:
        print(f"⚠️ Q&A error: {str(e)}")
        return f"Unable to answer due to an error. Please try again. Error: {str(e)}"
    
    return raw.strip()
