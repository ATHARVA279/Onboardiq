def get_general_response(question: str) -> str | None:
    general_responses = {
        "ok": "Feel free to ask me anything about the content!",
        "okay": "What else would you like to know?",
        "thanks": "You're welcome! Ask me anything else.",
        "thank you": "Happy to help! Any other questions?",
        "got it": "Great! What else can I help you with?",
        "alright": "Is there anything else you'd like to know?",
        "sure": "Go ahead, I'm here to help!",
        "yes": "What would you like to know?",
        "no": "Okay! Let me know if you need anything."
    }
    
    return general_responses.get(question.lower().strip())
