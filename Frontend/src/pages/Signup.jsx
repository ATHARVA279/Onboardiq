import { useState } from "react";
import { signInWithPopup, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { auth, googleProvider } from "../api/firebaseConfig";
import GlassCard from "../components/ui/GlassCard";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
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

  const handleSignup = async (event) => {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName.trim() });
      toast.success("Welcome to Onboardiq!");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--bg-hover)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    width: '100%',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.15s ease',
    outline: 'none'
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex' }}>
      {/* Left side - Hidden on mobile */}
      <div style={{
        flex: 1,
        display: 'none',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '64px',
        position: 'relative',
        overflow: 'hidden'
      }} className="hidden lg:flex">
        {/* Background gradient */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, var(--accent-muted) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '500px' }}>
          <h1 style={{
            fontSize: '56px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: '1.1',
            marginBottom: '24px'
          }}>
            Accelerate your<br />onboarding.
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6'
          }}>
            Index your engineering knowledge and give every new developer a cited path to answers. Start building your workspace in seconds.
          </p>
        </div>
      </div>

      {/* Right side - Signup form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }}>
        <GlassCard style={{ padding: '40px', maxWidth: '440px', width: '100%' }}>
          {/* Logo */}
          <div style={{
            fontSize: '24px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '32px',
            letterSpacing: '-0.02em'
          }}>
            Onboardiq
          </div>

          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '8px',
            letterSpacing: '-0.02em'
          }}>
            Create account
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '32px'
          }}>
            Stand up your team knowledge base today
          </p>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--bg-hover)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'Inter, sans-serif'
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.borderColor = 'var(--accent-primary)'
              }
            }}
            onMouseLeave={e => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--bg-elevated)'
                e.currentTarget.style.borderColor = 'var(--bg-hover)'
              }
            }}
          >
            {loading ? (
              <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <>
                <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24">
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

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '24px 0',
            gap: '16px'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--bg-hover)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              or
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--bg-hover)' }} />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none'
                }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  style={{ ...inputStyle, paddingLeft: '44px' }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--accent-primary)'
                    e.target.style.boxShadow = '0 0 0 3px var(--accent-muted)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--bg-hover)'
                    e.target.style.boxShadow = 'none'
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none'
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={{ ...inputStyle, paddingLeft: '44px' }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--accent-primary)'
                    e.target.style.boxShadow = '0 0 0 3px var(--accent-muted)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--bg-hover)'
                    e.target.style.boxShadow = 'none'
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none'
                }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  style={{ ...inputStyle, paddingLeft: '44px' }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--accent-primary)'
                    e.target.style.boxShadow = '0 0 0 3px var(--accent-muted)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--bg-hover)'
                    e.target.style.boxShadow = 'none'
                  }}
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(var(--status-high-rgb), 0.1)',
                border: '1px solid var(--status-high)',
                borderRadius: '8px',
                color: 'var(--status-high)',
                fontSize: '13px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: loading ? 'var(--bg-hover)' : 'var(--accent-primary)',
                color: loading ? 'var(--text-tertiary)' : 'var(--bg-base)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                fontFamily: 'Inter, sans-serif',
                marginTop: '8px'
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.background = 'var(--accent-primary-hover)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px var(--accent-muted)'
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.background = 'var(--accent-primary)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 0.6s linear infinite' }} />
                  Signing Up...
                </>
              ) : (
                <>
                  Sign Up
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p style={{
            marginTop: '24px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            textAlign: 'center'
          }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                color: 'var(--accent-primary)',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'color 0.15s'
              }}
              onMouseEnter={e => e.target.style.color = 'var(--accent-primary-hover)'}
              onMouseLeave={e => e.target.style.color = 'var(--accent-primary)'}
            >
              Sign in
            </Link>
          </p>
        </GlassCard>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (min-width: 1024px) {
          .hidden { display: none !important; }
          .lg\\:flex { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
