import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Trash2, Bot, User, Sparkles, Code2, Database } from "lucide-react";
import { toast } from 'react-toastify';
import { PulseLoader } from 'react-spinners';
import api from "../api/backend";
import NoContentMessage from "../components/NoContentMessage";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { useWorkspace } from "../context/WorkspaceContext";

function CitationChips({ sources }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? sources : sources.slice(0, 3);

  return (
    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--bg-hover)] mt-4">
      <div className="flex items-center gap-2 w-full mb-1 px-1">
        <Database className="w-3 h-3 text-[var(--accent-primary)]" />
        <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">Sources</span>
      </div>
      {displayed.map((src, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--bg-hover)] hover:border-[var(--accent-primary)]/40 transition-colors cursor-pointer group max-w-[200px]" title={src.file_path}>
          <Code2 className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors" />
          <span className="text-[12px] text-[var(--text-secondary)] truncate group-hover:text-[var(--text-primary)]">
            {src.file_path?.split('/').pop() || `Source ${i + 1}`}
          </span>
        </div>
      ))}
      {!showAll && sources.length > 3 && (
        <button 
          onClick={() => setShowAll(true)}
          className="text-[11px] text-[var(--accent-primary)] font-bold px-1 hover:underline self-center"
        >
          +{sources.length - 3} more
        </button>
      )}
      {showAll && sources.length > 3 && (
        <button 
          onClick={() => setShowAll(false)}
          className="text-[11px] text-[var(--text-tertiary)] font-bold px-1 hover:underline self-center"
        >
          Show less
        </button>
      )}
    </div>
  );
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const { workspace } = useWorkspace();

  const workspaceId = workspace?._id;

  useEffect(() => {
    if (!workspaceId) return;
    
    const storageKey = `chat_session_${workspaceId}`;
    let storedSessionId = localStorage.getItem(storageKey);
    
    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(storageKey, storedSessionId);
    }
    
    setSessionId(storedSessionId);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !sessionId) return;
    
    const loadHistory = async () => {
      try {
        const res = await api.get(`/workspace/${workspaceId}/sessions/${sessionId}`);
        if (res.data.messages && res.data.messages.length > 0) {
          const formattedMessages = res.data.messages.map(msg => ({
            role: msg.role === "model" ? "ai" : msg.role,
            text: msg.content,
            sources: msg.sources || []
          }));
          setMessages(formattedMessages);
        }
      } catch (err) {
        console.log("No existing chat history for this session");
      }
    };
    loadHistory();
  }, [workspaceId, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!workspace || !workspaceId) {
    return (
      <PageLayout>
        <NoContentMessage feature="the Chat feature" />
      </PageLayout>
    );
  }

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage = { role: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post(`/workspace/${workspaceId}/ask`, {
        workspace_id: workspaceId,
        question: input,
        session_id: sessionId,
        source_ids: null
      });

      const aiMessage = {
        role: "ai",
        text: res.data.answer,
        sources: res.data.sources_cited || [],
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      const errorDetail = err.response?.data?.detail || "Failed to get response.";
      toast.error(errorDetail);
      const errorMessage = {
        role: "ai",
        text: "Sorry, I couldn't process that. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (!sessionId) return;
    
    try {
      await api.delete(`/workspace/${workspaceId}/sessions/${sessionId}`);
      setMessages([]);
      
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storageKey = `chat_session_${workspaceId}`;
      localStorage.setItem(storageKey, newSessionId);
      setSessionId(newSessionId);
      
      toast.success("Chat cleared!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear chat");
    }
  };

  return (
    <PageLayout className="h-[calc(100vh-4rem)] flex flex-col py-0">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full h-full pt-8 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10 px-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-4">
              <MessageCircle className="w-8 h-8 text-[var(--accent-primary)]" />
              Chat Assistant
            </h1>
            <p className="text-base text-[var(--text-tertiary)] mt-2">Ask questions about your workspace with AI context</p>
          </div>

          <Button variant="ghost" size="md" onClick={clearChat} className="text-[var(--text-tertiary)] hover:text-[var(--status-high)] hover:bg-[var(--status-high)]/10 text-sm font-medium">
            <Trash2 className="w-5 h-5 mr-2" />
            Clear Chat
          </Button>
        </div>

        {/* Messages Area */}
        <Card className="flex-1 overflow-y-auto mb-8 bg-[var(--bg-surface)] border-[var(--bg-hover)] p-0 flex flex-col shadow-2xl relative rounded-2xl">
          <div className="flex-1 p-8 space-y-10">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-24">
                <div className="w-24 h-24 bg-[var(--bg-elevated)] rounded-3xl flex items-center justify-center mb-8 border border-[var(--bg-hover)] shadow-2xl relative group">
                  <div className="absolute inset-0 bg-[var(--accent-primary)] opacity-10 rounded-3xl blur-2xl group-hover:opacity-20 transition-opacity"></div>
                  <Sparkles className="w-12 h-12 text-[var(--accent-primary)] relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4">How can I unblock you?</h3>
                <p className="text-base text-[var(--text-tertiary)] max-w-sm mx-auto leading-relaxed">
                  I can summarize repositories, explain logic flows, or help you find specific documentation.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border
                  ${msg.role === "user" 
                    ? "bg-[var(--bg-elevated)] border-[var(--bg-hover)]" 
                    : "bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary-hover)] border-transparent"
                  }
                `}>
                  {msg.role === "user" ? <User className="w-6 h-6 text-[var(--text-secondary)]" /> : <Bot className="w-6 h-6 text-[var(--bg-base)]" />}
                </div>

                <div className="max-w-[85%] space-y-4">
                  <div className={`
                    p-6 rounded-2xl text-[15px] leading-relaxed shadow-sm border
                    ${msg.role === "user"
                      ? "bg-[var(--accent-muted)] border-[var(--accent-primary)]/20 text-[var(--text-primary)] rounded-tr-none"
                      : "bg-[var(--bg-elevated)] border-[var(--bg-hover)] text-[var(--text-primary)] rounded-tl-none"
                    }
                  `}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {msg.role === "ai" && msg.sources?.length > 0 && (
                    <CitationChips sources={msg.sources} />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary-hover)] flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bot className="w-6 h-6 text-[var(--bg-base)]" />
                </div>
                <div className="bg-[var(--bg-elevated)] border border-[var(--bg-hover)] p-6 rounded-2xl rounded-tl-none shadow-sm">
                  <PulseLoader color="var(--accent-primary)" size={10} margin={5} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Input Area */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-hover)] opacity-0 group-focus-within:opacity-10 rounded-2xl transition duration-500 blur"></div>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask a question about your code..."
            className="pr-32 py-6 bg-[var(--bg-surface)] border-[var(--bg-hover)] focus:border-[var(--accent-primary)] shadow-2xl text-base text-[var(--text-primary)] relative z-10 rounded-xl"
            disabled={loading}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
            <Button
              size="lg"
              variant="gradient"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="h-12 px-6 rounded-xl font-bold text-sm"
            >
              <Send className="w-5 h-5 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
