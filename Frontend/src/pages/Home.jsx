import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Link as LinkIcon,
  Sparkles,
  Trash2,
  Rocket,
  Target,
  Settings,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { PulseLoader } from "react-spinners";
import api from "../api/backend";
import ConceptCard from "../components/ConceptCard";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [concepts, setConcepts] = useState([]);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [mlReady, setMlReady] = useState(false);
  const [initializingML, setInitializingML] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      const loadDocument = async () => {
        try {
          setLoading(true);
          const docRes = await api.get(`/library/${id}`);
          const doc = docRes.data;

          const info = {
            url: doc.url,
            textLength: doc.text_content?.length || 0,
            chunksIndexed: doc.metadata?.total_chunks || 0,
          };

          setExtractedInfo(info);
          setConcepts(doc.concepts || []);
          setUrl(doc.url);

          localStorage.setItem(
            "extractedConcepts",
            JSON.stringify(doc.concepts || []),
          );
          localStorage.setItem("extractedInfo", JSON.stringify(info));
          localStorage.setItem("extractedUrl", doc.url);
          localStorage.setItem("extractedDocumentId", id);

          setLoading(false);
        } catch (e) {
          console.error("Failed to load document", e);
          toast.error("Failed to load document");
          setLoading(false);
          navigate("/app");
        }
      };
      loadDocument();
      return;
    }

    const savedConcepts = localStorage.getItem("extractedConcepts");
    const savedInfo = localStorage.getItem("extractedInfo");
    const savedUrl = localStorage.getItem("extractedUrl");

    if (savedConcepts) {
      try {
        setConcepts(JSON.parse(savedConcepts));
      } catch (e) {
        localStorage.removeItem("extractedConcepts");
      }
    }
    if (savedInfo) {
      try {
        setExtractedInfo(JSON.parse(savedInfo));
      } catch (e) {
        localStorage.removeItem("extractedInfo");
      }
    }
    if (savedUrl) {
      setUrl(savedUrl);
    }

    const initializeML = async () => {
      setInitializingML(true);
      try {
        await api.get("/warmup");
        setMlReady(true);
      } catch (err) {
        setMlReady(true);
      } finally {
        setInitializingML(false);
      }
    };
    initializeML();
  }, [id, navigate]);

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const pollTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const handleExtract = async () => {
    if (!url.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }

    setLoading(true);
    setProgress(0);
    setStatus("Starting extraction...");
    setConcepts([]);
    setExtractedInfo(null);

    try {
      const { data } = await api.post("/extract", { url });

      if (data.status === "already_extracted") {
        setLoading(false);
        toast.success(data.message || "URL already extracted!");

        try {
          const docRes = await api.get(`/library/${data.document_id}`);
          const doc = docRes.data;

          const info = {
            url: doc.url,
            textLength: doc.text_content?.length || 0,
            chunksIndexed: doc.metadata?.total_chunks || 0,
          };

          setExtractedInfo(info);
          setConcepts(doc.concepts || []);

          localStorage.setItem(
            "extractedConcepts",
            JSON.stringify(doc.concepts || []),
          );
          localStorage.setItem("extractedInfo", JSON.stringify(info));
          localStorage.setItem("extractedUrl", url);
          localStorage.setItem("extractedDocumentId", data.document_id);
        } catch (e) {
          toast.error("Failed to load document details");
        }
        return;
      }

      const { job_id } = data;

      const pollStatus = async () => {
        try {
          const job = await api.get(`/extract/status/${job_id}`);
          const { status, progress, result, error } = job.data;

          setProgress(progress);
          setStatus(
            status === "processing" ? `Extracting... ${progress}%` : status,
          );

          if (status === "completed") {
            setLoading(false);

            try {
              const docRes = await api.get(`/library/${result.document_id}`);
              const doc = docRes.data;

              const info = {
                url: doc.url,
                textLength: doc.text_content?.length || 0,
                chunksIndexed: 0,
              };

              setExtractedInfo(info);
              setConcepts(doc.concepts || []);

              localStorage.setItem(
                "extractedConcepts",
                JSON.stringify(doc.concepts || []),
              );
              localStorage.setItem("extractedInfo", JSON.stringify(info));
              localStorage.setItem("extractedUrl", url);
              localStorage.setItem("extractedDocumentId", result.document_id);

              toast.success(`Successfully extracted content!`);
            } catch (e) {
              toast.success("Extraction complete!");
            }
          } else if (status === "failed") {
            setLoading(false);
            toast.error(`Extraction failed: ${error}`);
          } else {
            pollTimeoutRef.current = setTimeout(pollStatus, 3000);
          }
        } catch (err) {
          pollTimeoutRef.current = setTimeout(pollStatus, 3000);
        }
      };

      pollStatus();
    } catch (err) {
      setLoading(false);
      toast.error("Failed to start extraction.");
    }
  };

  const handleClearData = async () => {
    const confirmClear = () => {
      if (
        window.confirm("Start a new extraction? This will clear current view.")
      ) {
        localStorage.removeItem("extractedConcepts");
        localStorage.removeItem("extractedInfo");
        localStorage.removeItem("extractedUrl");
        localStorage.removeItem("extractedDocumentId");
        setConcepts([]);
        setExtractedInfo(null);
        setUrl("");
        toast.success("Ready for new extraction!");
      }
    };
    confirmClear();
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-2 bg-[var(--bg-elevated)] rounded-full mb-6 border border-[var(--bg-hover)]">
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)] mr-2" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              AI-Powered Learning
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
            Transform content into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-hover)]">
              knowledge
            </span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">
            Enter any URL to extract key concepts and prepare the document for
            chat-based review.
          </p>
        </div>

        {initializingML && (
          <Card className="mb-8 border-[var(--accent-muted)] bg-[var(--accent-muted)]/5">
            <div className="flex items-center gap-3 text-[var(--accent-primary)] text-sm">
              <Settings className="w-4 h-4 animate-spin" />
              Initializing AI models (first time only)...
            </div>
          </Card>
        )}

        {/* Extract Section */}
        <Card className="mb-12 p-8 border-[var(--bg-hover)] shadow-2xl">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
              </div>
              <Input
                type="text"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleExtract()}
                className="pl-11 py-4 text-lg bg-[var(--bg-base)] border-[var(--bg-hover)] focus:border-[var(--accent-primary)]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="gradient"
                size="lg"
                onClick={handleExtract}
                disabled={loading}
                className="flex-1 text-base"
              >
                {loading ? (
                  <>
                    <PulseLoader color="var(--accent-primary)" size={8} className="mr-2" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Extract & Learn
                  </>
                )}
              </Button>

              {(concepts.length > 0 || extractedInfo) && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleClearData}
                  disabled={loading}
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  New
                </Button>
              )}
            </div>
          </div>

          {loading && (
            <div className="mt-8">
              <div className="flex justify-between text-sm text-[var(--text-tertiary)] mb-2">
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-[var(--bg-hover)] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[var(--accent-primary)] h-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </Card>

        {concepts.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Target className="w-5 h-5 text-[var(--accent-primary)]" />
                Key Concepts
              </h3>
              <Badge variant="default">{concepts.length} Found</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {concepts.map((concept, i) => (
                  <div key={i} className="group">
                  <ConceptCard concept={concept} />
                </div>
              ))}
            </div>
          </div>
        )}

        {!concepts.length && !loading && !extractedInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {[
              {
                icon: Target,
                title: "Key Concepts",
                desc: "Surface the most important ideas from the document",
              },
              {
                icon: MessageCircle,
                title: "Chat Ready",
                desc: "Keep the extracted document available for Q&A",
              },
              {
                icon: Rocket,
                title: "Fast Setup",
                desc: "Prepare onboarding material without extra steps",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[var(--bg-surface)]/30 border border-[var(--bg-hover)]/50"
              >
                <div className="w-12 h-12 mx-auto bg-[var(--bg-elevated)] rounded-xl flex items-center justify-center mb-4 border border-[var(--bg-hover)]">
                  <feature.icon className="w-6 h-6 text-[var(--text-tertiary)]" />
                </div>
                <h3 className="font-semibold text-[var(--text-secondary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--text-tertiary)]">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
