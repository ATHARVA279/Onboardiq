import { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { auth, googleProvider } from "../api/firebaseConfig";
import GlassCard from "../components/ui/GlassCard";

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

  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#f0f0f0',
    fontSize: '14px',
    width: '100%',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.15s ease',
    outline: 'none'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex' }}>
      {/* Left side - Hidden on mobile */}
      <div style={{
        flex: 1,
        display: 'none',
        '@media (min-width: 1024px)': { display: 'flex' },
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
          background: 'radial-gradient(circle, rgba(229, 25, 94, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '500px' }}>
          <h1 style={{
            fontSize: '56px',
            fontWeight: '800',
            color: '#f0f0f0',
            letterSpacing: '-0.03em',
            lineHeight: '1.1',
            marginBottom: '24px'
          }}>
            Your codebase.<br />Fully understood.
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#888',
            lineHeight: '1.6'
          }}>
            Stop asking senior developers the same questions. Get instant answers with exact source citations.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
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
            color: '#f0f0f0',
            marginBottom: '32px',
            letterSpacing: '-0.02em'
          }}>
            Onboardiq
          </div>

          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#f0f0f0',
            marginBottom: '8px',
            letterSpacing: '-0.02em'
          }}>
            Welcome back
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#888',
            marginBottom: '32px'
          }}>
            Sign in to access your workspace
          </p>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#f0f0f0',
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
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.borderColor = '#333'
              }
            }}
            onMouseLeave={e => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.borderColor = '#2a2a2a'
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
            <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
            <span style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              or
            </span>
            <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }} />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#888',
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
                  color: '#555',
                  pointerEvents: 'none'
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={{ ...inputStyle, paddingLeft: '44px' }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(229, 25, 94, 0.6)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(229, 25, 94, 0.1)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#2a2a2a'
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
                color: '#888',
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
                  color: '#555',
                  pointerEvents: 'none'
                }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ ...inputStyle, paddingLeft: '44px' }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(229, 25, 94, 0.6)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(229, 25, 94, 0.1)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#2a2a2a'
                    e.target.style.boxShadow = 'none'
                  }}
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                color: '#ef4444',
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
                background: loading ? '#333' : '#e5195e',
                color: loading ? '#666' : '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
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
                  e.currentTarget.style.background = '#ff2070'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(229, 25, 94, 0.3)'
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.background = '#e5195e'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 0.6s linear infinite' }} />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p style={{
            marginTop: '24px',
            fontSize: '13px',
            color: '#888',
            textAlign: 'center'
          }}>
            Don't have an account?{' '}
            <Link
              to="/signup"
              style={{
                color: '#e5195e',
                textDecoration: 'none',
                fontWeight: '500',
                transition: 'color 0.15s'
              }}
              onMouseEnter={e => e.target.style.color = '#ff2070'}
              onMouseLeave={e => e.target.style.color = '#e5195e'}
            >
              Sign up
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
