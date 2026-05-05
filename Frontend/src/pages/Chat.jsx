import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Trash2, Bot, User } from "lucide-react";
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

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const { workspace } = useWorkspace();

  const workspaceId = workspace?._id;

  // Generate or retrieve session ID from localStorage
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

  // Load chat history when session is ready
  useEffect(() => {
    if (!workspaceId || !sessionId) return;
    
    const loadHistory = async () => {
      try {
        const res = await api.get(`/workspace/${workspaceId}/sessions/${sessionId}`);
        if (res.data.messages && res.data.messages.length > 0) {
          const formattedMessages = res.data.messages.map(msg => ({
            role: msg.role === "model" ? "ai" : msg.role,
            text: msg.content,
            sources: msg.sources?.length || 0
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
        sources: res.data.sources_cited?.length || 0,
        confidence: res.data.confidence_score
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
      
      // Generate new session ID
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
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full h-full pt-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-emerald-500" />
              Chat Assistant
            </h1>
            <p className="text-sm text-zinc-400">Ask questions about your workspace</p>
          </div>

          <Button variant="ghost" size="sm" onClick={clearChat} className="text-zinc-500 hover:text-red-400">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>
        </div>

        {/* Messages Area */}
        <Card className="flex-1 overflow-y-auto mb-4 bg-zinc-900/30 border-zinc-800/50 p-0 flex flex-col">
          <div className="flex-1 p-6 space-y-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
                <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800">
                  <Bot className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">How can I help you?</h3>
                <p className="text-sm max-w-xs mx-auto">
                  Ask me to summarize the codebase, explain complex concepts, or find specific details.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${msg.role === "user" ? "bg-zinc-800" : "bg-emerald-600"}
                `}>
                  {msg.role === "user" ? <User className="w-4 h-4 text-zinc-400" /> : <Bot className="w-4 h-4 text-white" />}
                </div>

                <div className={`max-w-[80%] space-y-2`}>
                  <div className={`
                    p-4 rounded-2xl text-sm leading-relaxed
                    ${msg.role === "user"
                      ? "bg-zinc-800 text-zinc-100 rounded-tr-none"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none"
                    }
                  `}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {msg.role === "ai" && (
                    <div className="flex gap-2 pl-1">
                      {msg.sources > 0 && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">{msg.sources} Sources</Badge>
                      )}
                      {msg.confidence !== undefined && (
                        <Badge variant="green" className="text-[10px] px-1.5 py-0">
                          {Math.round(msg.confidence * 100)}% Confidence
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl rounded-tl-none">
                  <PulseLoader color="#22c55e" size={6} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Input Area */}
        <div className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask a question..."
            className="pr-24 py-4 bg-zinc-900 border-zinc-800 focus:border-emerald-500 shadow-lg"
            disabled={loading}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              size="sm"
              variant="gradient"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="h-9 w-9 p-0 rounded-lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div >
    </PageLayout >
  );
}
