import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Code2,
  Database,
  ExternalLink,
  FileCheck,
  Github,
  GitBranch,
  Layers3,
  Linkedin,
  MessageSquare,
  Search,
  Shield,
  Twitter,
} from "lucide-react";

const heroAnswer =
  "The authentication flow starts in the gateway, validates the session token, then hands off to the JWT guard in the API. OAuth refresh logic was added after the Dec 2023 backend review, and the cited sources below explain both the implementation and the rationale.";

const painPoints = [
  {
    icon: Search,
    title: "Siloed Search",
    description:
      "Confluence only searches Confluence. GitHub only searches GitHub. Nobody sees the full picture.",
  },
  {
    icon: Shield,
    title: "Missing the Why",
    description:
      "Docs tell you what exists, never why a decision was made. The reasoning lives in a 2-year-old PR.",
  },
  {
    icon: AlertTriangle,
    title: "Silent Staleness",
    description:
      "Code gets refactored. Documentation doesn't. Nobody knows until something breaks.",
  },
];

const steps = [
  {
    number: "01",
    icon: GitBranch,
    title: "Connect Sources",
    description:
      "Link your GitHub repos, Confluence spaces, and Notion pages. OnboardIQ indexes everything in under 5 minutes.",
  },
  {
    number: "02",
    icon: MessageSquare,
    title: "Ask in Plain English",
    description:
      "New developers ask any question about architecture, conventions, or business logic. No query syntax. Just language.",
  },
  {
    number: "03",
    icon: FileCheck,
    title: "Get Cited Answers",
    description:
      "Every answer cites its exact sources: the code file, the doc page, the Slack thread. No hallucination. No black box.",
  },
];

const integrations = [
  { name: "GitHub", icon: Github },
  { name: "Confluence", icon: BookOpen },
  { name: "Notion", icon: Layers3 },
  { name: "Slack", icon: MessageSquare },
  { name: "GitBook", icon: BookOpen },
  { name: "Linear", icon: Activity },
  { name: "Jira", icon: Shield },
  { name: "VS Code", icon: Code2 },
];

const stats = [
  { value: 5, prefix: "<", suffix: " min", label: "Indexing time for repos up to 10k files" },
  { value: 3, prefix: "<", suffix: " sec", label: "Time to first cited answer" },
  { value: 100, prefix: "", suffix: "%", label: "Answers include source attribution" },
  { value: 80, prefix: ">", suffix: "%", label: "Staleness detection precision" },
];

function BracketMark() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 text-[var(--color-primary)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M8 5H4v14h4" />
      <path d="M16 5h4v14h-4" />
    </svg>
  );
}

function FeatureBlock({
  tag,
  title,
  body,
  textSide = "left",
  visual,
}) {
  const textReveal = textSide === "left" ? "left" : "right";
  const visualReveal = textSide === "left" ? "right" : "left";

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {textSide === "left" ? (
        <>
          <div
            className="oi-scroll-reveal"
            data-reveal={textReveal}
            data-observe="feature"
          >
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--color-primary)]">
              {tag}
            </p>
            <h3 className="font-display mt-4 text-3xl font-semibold text-[var(--color-text)] md:text-[40px]">
              {title}
            </h3>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--color-muted)]">
              {body}
            </p>
          </div>
          <div
            className="oi-scroll-reveal"
            data-reveal={visualReveal}
            data-observe="feature"
          >
            {visual}
          </div>
        </>
      ) : (
        <>
          <div
            className="oi-scroll-reveal order-2 lg:order-1"
            data-reveal={visualReveal}
            data-observe="feature"
          >
            {visual}
          </div>
          <div
            className="oi-scroll-reveal order-1 lg:order-2"
            data-reveal={textReveal}
            data-observe="feature"
          >
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--color-primary)]">
              {tag}
            </p>
            <h3 className="font-display mt-4 text-3xl font-semibold text-[var(--color-text)] md:text-[40px]">
              {title}
            </h3>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--color-muted)]">
              {body}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function Landing() {
  const [navSolid, setNavSolid] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const countRefs = useRef([]);
  const hasTyped = useRef(false);
  const hasCounted = useRef(false);

  const heroWords = useMemo(
    () => [
      "Stop",
      "Asking",
      "Senior",
      "Developers",
      "Twice.",
    ],
    [],
  );

  useEffect(() => {
    const onScroll = () => {
      setNavSolid(window.scrollY > 16);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const typeDelay = window.setTimeout(() => {
      if (hasTyped.current) {
        return;
      }

      hasTyped.current = true;
      let index = 0;
      const interval = window.setInterval(() => {
        index += 1;
        setTypedAnswer(heroAnswer.slice(0, index));
        if (index >= heroAnswer.length) {
          window.clearInterval(interval);
        }
      }, 30);
    }, 800);

    return () => window.clearTimeout(typeDelay);
  }, []);

  useEffect(() => {
    const revealTargets = document.querySelectorAll("[data-observe]");
    const badges = document.querySelectorAll("[data-seq-badge]");
    const line = document.querySelector("[data-flow-line]");
    const statBar = document.querySelector("[data-stats-bar]");

    if (line) {
      line.style.strokeDasharray = "1";
      line.style.strokeDashoffset = "1";
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");

          if (entry.target === line) {
            line.style.strokeDashoffset = "0";
          }

          if (entry.target === statBar && !hasCounted.current) {
            hasCounted.current = true;
            countRefs.current.forEach((node, index) => {
              if (!node) {
                return;
              }

              const target = stats[index].value;
              const duration = 1200;
              const start = performance.now();

              const tick = (now) => {
                const progress = Math.min((now - start) / duration, 1);
                const nextValue = Math.round(target * progress);
                node.textContent = `${stats[index].prefix}${nextValue}${stats[index].suffix}`;
                if (progress < 1) {
                  window.requestAnimationFrame(tick);
                }
              };

              window.requestAnimationFrame(tick);
            });
          }

          if (entry.target.dataset.observe === "badge-sequence") {
            badges.forEach((badge, index) => {
              window.setTimeout(() => {
                badge.classList.add("is-visible", "oi-badge-pulse");
              }, index * 180);
            });
          }

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 },
    );

    revealTargets.forEach((target) => observer.observe(target));
    if (line) {
      observer.observe(line);
    }
    if (statBar) {
      observer.observe(statBar);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="oi-shell">
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
          navSolid
            ? "border-[var(--color-border)] bg-[rgba(10,14,23,0.95)] backdrop-blur-xl"
            : "border-transparent bg-[rgba(10,14,23,0.78)]"
        }`}
        style={{
          height: "64px",
          animation: "heroWord 500ms ease forwards",
          opacity: 0,
          transform: "translateY(-10px)",
        }}
      >
        <div className="oi-container flex h-full items-center justify-between">
          <a href="#top" className="flex items-center gap-3">
            <BracketMark />
            <span className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">
              OnboardIQ
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm md:flex">
            {[
              ["Product", "#product"],
              ["How It Works", "#how-it-works"],
              ["Integrations", "#integrations"],
              ["Pricing", "#waitlist"],
            ].map(([label, href]) => (
              <a key={label} href={href} className="oi-nav-link text-[14px]">
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <a href="#waitlist" className="oi-button oi-button-secondary hidden sm:inline-flex">
              Request Access
            </a>
            <a href="/auth" className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">
              Sign In
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="oi-grid-bg flex min-h-screen items-center pt-24">
          <div className="oi-container grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div
                className="inline-flex min-h-[36px] items-center rounded-md border border-[rgba(59,130,246,0.4)] bg-[rgba(17,24,39,0.94)] px-4 py-2 font-mono text-[12px] text-[var(--color-primary)]"
                style={{
                  opacity: 0,
                  transform: "translateY(-20px)",
                  animation: "heroWord 540ms ease forwards",
                  animationDelay: "100ms",
                }}
              >
                Developer Onboarding Intelligence
              </div>

              <h1 className="font-display mt-8 text-[52px] font-bold leading-[1.05] tracking-[-0.04em] text-[var(--color-text)] md:text-[72px]">
                {heroWords.map((word, index) => (
                  <span
                    key={word}
                    className={`oi-word mr-[0.3em] ${word === "Twice." ? "text-[var(--color-primary)]" : ""}`}
                    style={{ "--word-delay": `${200 + index * 80}ms` }}
                  >
                    {word}
                  </span>
                ))}
              </h1>

              <p
                className="mt-8 max-w-[560px] text-lg leading-8 text-[var(--color-muted)]"
                style={{
                  opacity: 0,
                  transform: "translateY(24px)",
                  animation: "heroWord 680ms ease forwards",
                  animationDelay: "400ms",
                }}
              >
                OnboardIQ indexes your GitHub, Confluence, and Slack into a unified
                knowledge graph. New developers get answers with citations, not links
                to a 50-page wiki.
              </p>

              <div
                className="mt-10 flex flex-col gap-4 sm:flex-row"
                style={{
                  opacity: 0,
                  transform: "translateY(24px)",
                  animation: "heroWord 680ms ease forwards",
                  animationDelay: "500ms",
                }}
              >
                <a href="#waitlist" className="oi-button oi-button-primary">
                  Connect Your Repo
                </a>
                <a href="#product" className="oi-button oi-button-secondary">
                  See a Live Demo
                </a>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-[13px] text-[var(--color-muted)]">
                <span>Indexes in under 5 minutes</span>
                <span className="text-[var(--color-primary)]">·</span>
                <span>Answers in under 3 seconds</span>
                <span className="text-[var(--color-primary)]">·</span>
                <span>Zero hallucination policy</span>
              </div>
            </div>

            <div
              id="product"
              className="oi-panel relative overflow-hidden"
              style={{
                opacity: 0,
                transform: "translateY(40px)",
                animation: "heroWord 720ms ease forwards",
                animationDelay: "700ms",
              }}
            >
              <div className="border-b border-[var(--color-border)] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-red)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-amber)]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-green)]" />
                  </div>
                  <span className="font-mono text-xs text-[var(--color-muted)]">
                    answer-session://onboardiq
                  </span>
                </div>
              </div>

              <div className="space-y-6 px-6 py-6">
                <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-code-bg)] p-4">
                  <p className="font-mono text-[13px] text-[var(--color-muted)]">Question</p>
                  <p className="mt-2 text-base text-[var(--color-text)]">
                    How does our authentication flow work?
                  </p>
                </div>

                <div className="rounded-md border border-[rgba(59,130,246,0.3)] bg-[rgba(13,17,23,0.96)] p-5">
                  <div className="flex items-center gap-3 text-[12px] text-[var(--color-primary)]">
                    <Database className="h-4 w-4" />
                    <span className="font-mono">Cross-source answer</span>
                  </div>
                  <p className="mt-4 min-h-[144px] text-[15px] leading-7 text-[var(--color-text)]">
                    {typedAnswer}
                    <span className="ml-0.5 inline-block h-5 w-[1px] animate-pulse bg-[var(--color-primary)] align-middle" />
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3" data-observe="badge-sequence">
                    {[
                      ["github", "src/auth/jwt.py", "text-[var(--color-green)]"],
                      ["confluence", "Auth Architecture", "text-[var(--color-primary)]"],
                      ["slack", "#backend-decisions Dec 2023", "text-[var(--color-amber)]"],
                    ].map(([source, label, color]) => (
                      <div
                        key={source}
                        data-seq-badge="true"
                        className="rounded-[4px] border border-[var(--color-border)] bg-[rgba(17,24,39,0.92)] px-3 py-2 opacity-0 transition-all duration-500"
                      >
                        <span className={`font-mono text-[12px] uppercase ${color}`}>{source}</span>
                        <span className="ml-2 font-mono text-[12px] text-[var(--color-text)]">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="oi-section">
          <div className="oi-container">
            <div className="max-w-3xl">
              <h2 className="font-display text-4xl font-semibold text-[var(--color-text)] md:text-[40px]">
                The Onboarding Tax
              </h2>
              <p className="mt-4 text-lg leading-8 text-[var(--color-muted)]">
                Knowledge lives in 5 different tools. New developers interrupt senior
                engineers 30-50 times a day.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {painPoints.map((item, index) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="oi-panel oi-scroll-reveal p-7"
                    data-observe="pain"
                    style={{ "--reveal-delay": `${index * 150}ms` }}
                  >
                    <Icon className="h-6 w-6 text-[var(--color-primary)]" />
                    <h3 className="font-display mt-5 text-2xl font-semibold text-[var(--color-text)]">
                      {item.title}
                    </h3>
                    <p className="mt-4 text-base leading-8 text-[var(--color-muted)]">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="oi-section bg-[rgba(17,24,39,0.96)]">
          <div className="oi-container">
            <div className="max-w-3xl">
              <h2 className="font-display text-4xl font-semibold text-[var(--color-text)] md:text-[40px]">
                From Question to Cited Answer in Seconds
              </h2>
            </div>

            <div className="relative mt-14">
              <svg
                className="absolute left-0 top-[76px] hidden h-8 w-full lg:block"
                viewBox="0 0 1200 40"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M120 20H1080"
                  stroke="rgba(59,130,246,0.55)"
                  strokeWidth="2"
                  strokeDasharray="8 10"
                  pathLength="1"
                  data-flow-line="true"
                  style={{
                    strokeDasharray: "1",
                    strokeDashoffset: "1",
                    transition: "stroke-dashoffset 1200ms ease",
                  }}
                />
              </svg>

              <div className="grid gap-6 lg:grid-cols-3">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <article
                      key={step.title}
                      className="oi-panel oi-scroll-reveal relative overflow-hidden p-7"
                      data-observe="step"
                      style={{ "--reveal-delay": `${index * 150}ms` }}
                    >
                      <span className="font-mono absolute right-6 top-5 text-4xl text-[rgba(59,130,246,0.28)]">
                        {step.number}
                      </span>
                      <Icon className="h-6 w-6 text-[var(--color-primary)]" />
                      <h3 className="font-display mt-8 text-2xl font-semibold text-[var(--color-text)]">
                        {step.title}
                      </h3>
                      <p className="mt-4 text-base leading-8 text-[var(--color-muted)]">
                        {step.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="oi-section">
          <div className="oi-container">
            <div className="max-w-3xl">
              <h2 className="font-display text-4xl font-semibold text-[var(--color-text)] md:text-[40px]">
                Three Things No Other Tool Does Together
              </h2>
            </div>

            <div className="mt-16 space-y-24">
              <FeatureBlock
                tag="SEARCH"
                title="Ask Once. Get Every Answer."
                body="One question simultaneously retrieves from GitHub code, Confluence documentation, and Slack threads. Every result is cited with its source, file path, and last-modified timestamp."
                textSide="left"
                visual={
                  <div className="oi-panel overflow-hidden p-6">
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-code-bg)] p-5">
                      <p className="font-mono text-xs text-[var(--color-muted)]">
                        Query fan-out
                      </p>
                      <div className="mt-4 flex items-center gap-3 rounded-md border border-[rgba(59,130,246,0.25)] bg-[rgba(17,24,39,0.92)] px-4 py-3">
                        <Search className="h-4 w-4 text-[var(--color-primary)]" />
                        <span className="text-sm text-[var(--color-text)]">
                          Show me the auth decision trail
                        </span>
                      </div>
                      <div className="mt-5 grid gap-3">
                        {[
                          ["github", "src/auth/jwt.py", "170ms"],
                          ["confluence", "Auth Architecture", "290ms"],
                          ["slack", "#backend-decisions", "340ms"],
                        ].map(([source, path, latency], index) => (
                          <div
                            key={source}
                            className="oi-scroll-reveal flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[rgba(17,24,39,0.82)] px-4 py-3"
                            data-observe="feature"
                            style={{ "--reveal-delay": `${index * 180}ms` }}
                          >
                            <div>
                              <p className="font-mono text-[12px] uppercase text-[var(--color-primary)]">
                                {source}
                              </p>
                              <p className="mt-1 font-mono text-[13px] text-[var(--color-text)]">
                                {path}
                              </p>
                            </div>
                            <span className="font-mono text-[12px] text-[var(--color-muted)]">
                              {latency}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                }
              />

              <FeatureBlock
                tag="EMBEDDINGS"
                title="Questions Retrieve Code, Not Just Docs."
                body="Most RAG systems miss code entirely. OnboardIQ uses joint embedding so 'how does auth work' retrieves the actual src/auth/jwt.py file, not just a documentation match."
                textSide="right"
                visual={
                  <div className="oi-panel overflow-hidden p-6">
                    <svg viewBox="0 0 520 320" className="w-full">
                      <defs>
                        <linearGradient id="embedLine" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                          <stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.7" />
                        </linearGradient>
                      </defs>
                      <rect x="20" y="50" width="150" height="72" rx="12" fill="#0D1117" stroke="#1E2D40" />
                      <text x="40" y="82" fill="#64748B" fontSize="12" fontFamily="JetBrains Mono">
                        question.txt
                      </text>
                      <text x="40" y="104" fill="#F1F5F9" fontSize="14" fontFamily="IBM Plex Sans">
                        how does auth work
                      </text>

                      <circle cx="260" cy="160" r="56" fill="#0D1117" stroke="#1E2D40" />
                      <text x="226" y="166" fill="#3B82F6" fontSize="12" fontFamily="JetBrains Mono">
                        vector
                      </text>

                      <rect x="350" y="34" width="140" height="72" rx="12" fill="#0D1117" stroke="#1E2D40" />
                      <text x="370" y="66" fill="#10B981" fontSize="12" fontFamily="JetBrains Mono">
                        code
                      </text>
                      <text x="370" y="88" fill="#F1F5F9" fontSize="13" fontFamily="JetBrains Mono">
                        src/auth/jwt.py
                      </text>

                      <rect x="350" y="214" width="140" height="72" rx="12" fill="#0D1117" stroke="#1E2D40" />
                      <text x="370" y="246" fill="#64748B" fontSize="12" fontFamily="JetBrains Mono">
                        docs
                      </text>
                      <text x="370" y="268" fill="#F1F5F9" fontSize="13" fontFamily="IBM Plex Sans">
                        Auth Overview
                      </text>

                      <path d="M170 86C220 86 196 142 204 142" stroke="url(#embedLine)" strokeWidth="3" fill="none" />
                      <path d="M316 144C344 122 346 98 350 90" stroke="url(#embedLine)" strokeWidth="3" fill="none" />
                      <path d="M316 176C344 198 346 222 350 230" stroke="#64748B" strokeOpacity="0.5" strokeWidth="2" fill="none" strokeDasharray="6 7" />
                    </svg>
                  </div>
                }
              />

              <FeatureBlock
                tag="MONITORING"
                title="Docs Lie. We Flag It Automatically."
                body="When a commit changes code, OnboardIQ semantically compares the new implementation against related documentation. If the docs still say JWT but the code was refactored to OAuth, we flag it before anyone gets confused."
                textSide="left"
                visual={
                  <div className="oi-panel overflow-hidden p-6">
                    <div className="rounded-md border border-[rgba(245,158,11,0.35)] bg-[rgba(13,17,23,0.96)] p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-[var(--color-amber)]" />
                          <p className="font-display text-xl font-semibold text-[var(--color-text)]">
                            Staleness Alert
                          </p>
                        </div>
                        <span className="rounded-[4px] border border-[rgba(245,158,11,0.3)] px-2 py-1 font-mono text-[11px] text-[var(--color-amber)]">
                          REVIEW
                        </span>
                      </div>
                      <div className="mt-5 rounded-md border border-[var(--color-border)] bg-[rgba(17,24,39,0.88)] p-4">
                        <p className="font-mono text-[12px] text-[var(--color-muted)]">
                          docs/auth-overview.md
                        </p>
                        <p className="mt-3 font-mono text-[13px] text-[var(--color-text)]">
                          Documentation may be outdated - last code change: 3 days ago
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[13px] text-[var(--color-muted)]">
                          <CheckCircle className="h-4 w-4 text-[var(--color-green)]" />
                          <span>Code now references OAuth refresh handlers</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[13px] text-[var(--color-muted)]">
                          <AlertTriangle className="h-4 w-4 text-[var(--color-amber)]" />
                          <span>Docs still describe JWT-only token rotation</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </section>

        <section id="integrations" className="oi-section">
          <div className="oi-container">
            <div className="max-w-3xl">
              <h2 className="font-display text-4xl font-semibold text-[var(--color-text)] md:text-[40px]">
                Indexes Everything Your Team Already Uses
              </h2>
            </div>

            <div className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-4">
              {integrations.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="oi-panel oi-integrations-card oi-scroll-reveal flex min-h-[148px] flex-col items-center justify-center gap-4 p-6 text-center"
                    data-observe="integration"
                    style={{ "--reveal-delay": `${index * 80}ms` }}
                  >
                    <Icon className="h-8 w-8 text-[var(--color-text)]" />
                    <p className="text-[13px] text-[var(--color-muted)]">{item.name}</p>
                  </div>
                );
              })}
            </div>

            <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
              More integrations shipping in Phase 3
            </p>
          </div>
        </section>

        <section
          className="border-y border-[var(--color-border)] bg-[rgba(17,24,39,0.96)] py-10"
          data-stats-bar="true"
          data-observe="stats"
        >
          <div className="oi-container grid gap-8 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="flex items-start gap-5 border-[var(--color-border)] lg:border-r lg:pr-8 last:border-r-0"
              >
                <div
                  ref={(node) => {
                    countRefs.current[index] = node;
                  }}
                  className="font-display min-w-[112px] text-4xl font-semibold leading-none text-[var(--color-text)] md:text-5xl"
                >
                  {`${stat.prefix}0${stat.suffix}`}
                </div>
                <p className="max-w-[190px] pt-2 text-sm leading-6 text-[var(--color-muted)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="waitlist" className="oi-section oi-grid-bg">
          <div className="oi-container">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="font-display text-4xl font-semibold text-[var(--color-text)] md:text-[48px]">
                Your team&apos;s knowledge. Finally searchable.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[var(--color-muted)]">
                Join the waitlist. First 50 teams get free indexing for 3 months.
              </p>

              <form
                className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row"
                onSubmit={(event) => event.preventDefault()}
              >
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(event) => setWaitlistEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="oi-input w-full flex-1"
                  aria-label="Email address"
                />
                <button type="submit" className="oi-button oi-button-primary sm:min-w-[220px]">
                  Request Early Access
                </button>
              </form>

              <p className="mt-4 font-mono text-[13px] text-[var(--color-muted)]">
                No credit card. No sales call. Just early access.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] py-16">
        <div className="oi-container grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <BracketMark />
              <span className="font-display text-xl font-bold">OnboardIQ</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--color-muted)]">
              Developer onboarding intelligence for engineering teams that need
              answers with proof, not another search box.
            </p>
            <div className="mt-6 flex items-center gap-4 text-[var(--color-muted)]">
              <a href="https://github.com" aria-label="GitHub" className="transition-colors hover:text-[var(--color-text)]">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" aria-label="LinkedIn" className="transition-colors hover:text-[var(--color-text)]">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" aria-label="Twitter" className="transition-colors hover:text-[var(--color-text)]">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <p className="font-display text-lg font-semibold text-[var(--color-text)]">Product</p>
            <div className="mt-4 space-y-3 text-sm text-[var(--color-muted)]">
              {["Features", "Integrations", "Changelog", "Roadmap"].map((item) => (
                <a key={item} href="#product" className="flex items-center gap-2 transition-colors hover:text-[var(--color-text)]">
                  <ChevronRight className="h-4 w-4" />
                  {item}
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:items-start">
            <p className="font-display text-lg font-semibold text-[var(--color-text)]">Company</p>
            <div className="mt-4 space-y-3 text-sm text-[var(--color-muted)]">
              {["About", "Blog", "Contact", "Privacy"].map((item) => (
                <a key={item} href="#waitlist" className="flex items-center gap-2 transition-colors hover:text-[var(--color-text)]">
                  <ExternalLink className="h-4 w-4" />
                  {item}
                </a>
              ))}
            </div>
            <p className="mt-8 font-mono text-[13px] text-[var(--color-muted)]">
              Built by Atharva Kharade
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
