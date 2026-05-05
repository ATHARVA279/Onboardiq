import React, { useState } from "react";
import { auth, googleProvider } from "../api/firebaseConfig";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  Shield,
} from "lucide-react";

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

const Auth = ({ initialIsLogin = true }) => {
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Welcome back!");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: fullName.trim() });
        await userCredential.user.getIdToken(true);
        toast.success("Account created! Welcome!");
      }
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="oi-grid-bg relative min-h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.14),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.08),transparent_36%)]" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
        <section className="flex min-w-0 flex-col justify-between border-b border-[var(--color-border)] px-6 py-8 sm:px-10 md:min-h-screen md:border-b-0 md:border-r md:px-10 md:py-10 lg:px-14">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <BracketMark />
              <span className="font-display text-xl font-bold tracking-tight text-[var(--color-text)]">
                OnboardIQ
              </span>
            </Link>

            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center gap-2 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              Back to site
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="py-10 md:py-12 lg:py-14">
            <div className="inline-flex min-h-[36px] items-center rounded-md border border-[rgba(59,130,246,0.35)] bg-[rgba(17,24,39,0.9)] px-4 py-2 font-mono text-[12px] text-[var(--color-primary)]">
              Secure workspace access
            </div>

            <h1 className="font-display mt-8 max-w-[520px] text-[40px] font-bold leading-[1.04] tracking-[-0.04em] text-[var(--color-text)] lg:text-[56px]">
              {isLogin
                ? "Resume onboarding with context."
                : "Stand up your team knowledge base."}
            </h1>

            <p className="font-editorial mt-6 max-w-[500px] text-[19px] leading-8 text-[var(--color-muted)] lg:text-[20px] lg:leading-9">
              {isLogin
                ? "Sign in to search across code, docs, and team decisions from one precise interface."
                : "Create an account to index your engineering knowledge and give every new developer a cited path to answers."}
            </p>

            <div className="mt-8 grid gap-4 xl:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "Cited Answers",
                  body: "Every response points back to code, docs, and team discussion.",
                },
                {
                  icon: CheckCircle,
                  title: "Fast Indexing",
                  body: "Connect repos and docs in minutes, not onboarding sprints.",
                },
                {
                  icon: ArrowRight,
                  title: "Lower Interrupts",
                  body: "New engineers unblock themselves without pinging senior devs.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[var(--color-border)] bg-[rgba(17,24,39,0.72)] p-5"
                  >
                    <Icon className="h-5 w-5 text-[var(--color-primary)]" />
                    <h2 className="font-display mt-4 text-lg font-semibold text-[var(--color-text)]">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      {item.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--color-muted)]">
            <span>SSO-ready foundation</span>
            <span className="text-[var(--color-primary)]">·</span>
            <span>Encrypted auth flow</span>
            <span className="text-[var(--color-primary)]">·</span>
            <span>Built for engineering teams</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 md:px-8 md:py-8 lg:px-14">
          <div className="w-full max-w-[460px] rounded-2xl border border-[var(--color-border)] bg-[rgba(17,24,39,0.9)] p-6 shadow-[0_24px_60px_rgba(2,8,23,0.34)] sm:p-8 md:sticky md:top-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--color-primary)]">
                  {isLogin ? "Sign In" : "Create Account"}
                </p>
                <h2 className="font-display mt-3 text-3xl font-semibold text-[var(--color-text)]">
                  {isLogin ? "Access your workspace" : "Request your workspace"}
                </h2>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[rgba(13,17,23,0.9)] sm:flex">
                <Shield className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
            </div>

            <p className="font-editorial mt-4 text-[18px] leading-8 text-[var(--color-muted)]">
              {isLogin
                ? "Continue into the product dashboard and pick up where your team left off."
                : "Set up your account and start turning fragmented team knowledge into one searchable system."}
            </p>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-8 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-md border border-[var(--color-border)] bg-[rgba(13,17,23,0.96)] px-4 text-sm font-medium text-[var(--color-text)] transition-all duration-200 hover:border-[rgba(59,130,246,0.5)] hover:bg-[rgba(17,24,39,0.96)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--color-border)]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[rgba(17,24,39,0.9)] px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Or use email
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--color-muted)]">
                    Full name
                  </span>
                  <div className="relative">
                    <Shield className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                    <input
                      type="text"
                      placeholder="Ada Lovelace"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="oi-input w-full pl-11"
                      required={!isLogin}
                      autoComplete="name"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm text-[var(--color-muted)]">
                  Email
                </span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="oi-input w-full pl-11"
                    required
                    autoComplete="off"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[var(--color-muted)]">
                  Password
                </span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    type="password"
                    placeholder={
                      isLogin ? "Enter your password" : "Create a password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="oi-input w-full pl-11"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="oi-button oi-button-primary mt-2 w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing
                  </>
                ) : isLogin ? (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[rgba(13,17,23,0.86)] px-4 py-3">
              <p className="text-sm text-[var(--color-muted)]">
                {isLogin ? "Need an account?" : "Already have an account?"}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-primary)]"
                >
                  {isLogin ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>

            <p className="mt-5 font-mono text-[12px] leading-6 text-[var(--color-muted)]">
              No credit card. No sales call. Just secure access to your
              team&apos;s onboarding intelligence.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Auth;
