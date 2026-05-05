import { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { ArrowRight, Loader2, Lock, Mail, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { auth, googleProvider } from "../api/firebaseConfig";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="oi-grid-bg min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8 text-[var(--color-text)] sm:px-10 lg:px-14 lg:py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-code-bg)] text-lg font-bold text-[var(--color-primary)]">
                O
              </div>
              <div>
                <p className="text-xl font-bold">Onboardiq</p>
                <p className="text-sm text-[var(--color-muted)]">
                  Developer onboarding intelligence
                </p>
              </div>
            </div>
            <Link to="/" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
              Home
            </Link>
          </div>

          <div className="py-12">
            <div className="inline-flex rounded-md border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.12)] px-4 py-2 text-sm text-[var(--color-primary)]">
              Secure workspace access
            </div>
            <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Sign in and start answering developer questions with context.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--color-muted)]">
              Connect code, docs, and team knowledge into one retrieval layer built for onboarding.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                "Cross-source answers with citations",
                "Repository indexing and documentation health",
                "Workspace-based onboarding intelligence",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-code-bg)] p-4">
                  <Shield className="h-5 w-5 text-[var(--color-primary)]" />
                  <p className="mt-3 text-sm leading-7 text-[var(--color-text)]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-[var(--color-muted)]">
            Use your Firebase account to access your workspace and keep onboarding answers secure.
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Login
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[var(--color-text)]">
              Access your workspace
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              Sign in with Google or use your email and password.
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-8 flex min-h-[44px] w-full items-center justify-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-code-bg)] px-4 text-sm font-medium text-[var(--color-text)] transition-all duration-200 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
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
                <span className="bg-[var(--color-surface)] px-3 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Or use email
                </span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--color-text)]">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    className="oi-input w-full pl-11"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--color-text)]">Password</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="oi-input w-full pl-11"
                    required
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] px-4 py-3 text-sm text-[var(--color-red)]">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="oi-button oi-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing In
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-sm text-[var(--color-muted)]">
              Need an account?
              <Link
                to="/signup"
                className="ml-2 font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dim)]"
              >
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
