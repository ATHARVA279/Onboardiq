import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Code2, Search, Globe, AlertTriangle, MessageSquare, Zap } from 'lucide-react'
import GlassCard from '../components/ui/GlassCard'
import AccentButton from '../components/ui/AccentButton'

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    {
      icon: Code2,
      title: 'GitHub Repository Indexing',
      description: 'Connect any GitHub repo and index every file with language-aware chunking for Python, JavaScript, TypeScript, and Java.'
    },
    {
      icon: Search,
      title: 'Natural Language Q&A',
      description: 'Ask questions in plain English and get answers that cite the exact file path, function name, and line numbers.'
    },
    {
      icon: Globe,
      title: 'Documentation Indexing',
      description: 'Connect documentation URLs and get answers that combine code context with written documentation simultaneously.'
    },
    {
      icon: AlertTriangle,
      title: 'Staleness Detection',
      description: 'Automatically detects when your README or documentation is out of sync with your actual codebase.'
    },
    {
      icon: MessageSquare,
      title: 'Persistent Chat Sessions',
      description: 'All conversations are saved per workspace. Return anytime and continue where you left off.'
    },
    {
      icon: Zap,
      title: 'Multi-Provider AI',
      description: 'Groq LLaMA 3.3 for fast answers with Gemini as fallback. Answers stay accurate even when providers have rate limits.'
    }
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#080808' }}>
      {/* Navbar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(8, 8, 8, 0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid #1a1a1a' : '1px solid transparent',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 32px',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#f0f0f0', letterSpacing: '-0.02em' }}>
            Onboardiq
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <a href="/login" style={{ color: '#888', fontSize: '14px', textDecoration: 'none', transition: 'color 0.15s' }}
               onMouseEnter={e => e.target.style.color = '#f0f0f0'}
               onMouseLeave={e => e.target.style.color = '#888'}>
              Sign In
            </a>
            <AccentButton onClick={() => navigate('/login')}>
              Get Started
            </AccentButton>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '72px'
      }}>
        {/* Background gradient */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(229, 25, 94, 0.03) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        
        {/* Grid pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M0 0h60v60H0z' fill='none' stroke='%23ffffff' stroke-width='0.5' stroke-opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
          pointerEvents: 'none'
        }} />

        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 32px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 96px)',
            fontWeight: '800',
            letterSpacing: '-0.04em',
            lineHeight: '1.1',
            marginBottom: '24px'
          }}>
            <div style={{ color: '#f0f0f0' }}>Stop asking seniors</div>
            <div style={{ color: '#e5195e' }}>the same questions.</div>
          </h1>
          
          <p style={{
            fontSize: '18px',
            color: '#888',
            marginBottom: '40px',
            maxWidth: '600px',
            margin: '0 auto 40px'
          }}>
            Index your codebase. Ask anything. Get answers with exact source citations.
          </p>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <AccentButton size="lg" onClick={() => navigate('/login')}>
              Get Started Free
            </AccentButton>
            <AccentButton size="lg" variant="ghost" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              View Demo
            </AccentButton>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: '120px 32px',
        maxWidth: '1280px',
        margin: '0 auto'
      }}>
        <h2 style={{
          fontSize: '40px',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '64px',
          color: '#f0f0f0',
          letterSpacing: '-0.02em'
        }}>
          What Onboardiq does
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {features.map((feature, index) => (
            <GlassCard key={index} style={{ padding: '32px' }} hover>
              <feature.icon style={{ width: '32px', height: '32px', color: '#e5195e', marginBottom: '20px' }} />
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#f0f0f0',
                marginBottom: '12px',
                letterSpacing: '-0.01em'
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#888',
                lineHeight: '1.6'
              }}>
                {feature.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{
        padding: '120px 32px',
        background: '#0d0d0d',
        borderTop: '1px solid #1a1a1a',
        borderBottom: '1px solid #1a1a1a'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '40px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '64px',
            color: '#f0f0f0',
            letterSpacing: '-0.02em'
          }}>
            How it works
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            {[
              {
                step: '1',
                title: 'Connect your sources',
                description: 'Connect your GitHub repo or documentation URL. Indexing completes in minutes.'
              },
              {
                step: '2',
                title: 'Ask questions',
                description: 'Ask any question about the codebase in natural language. No special syntax required.'
              },
              {
                step: '3',
                title: 'Get cited answers',
                description: 'Receive answers showing exact source files and line numbers with full context.'
              }
            ].map((item, index) => (
              <div key={index} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(229, 25, 94, 0.15)',
                  border: '1px solid rgba(229, 25, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#e5195e'
                }}>
                  {item.step}
                </div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#f0f0f0',
                  marginBottom: '12px',
                  letterSpacing: '-0.01em'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#888',
                  lineHeight: '1.6'
                }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '120px 32px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '48px',
            fontWeight: '700',
            color: '#f0f0f0',
            marginBottom: '32px',
            letterSpacing: '-0.02em'
          }}>
            Start understanding your codebase today.
          </h2>
          <AccentButton size="lg" onClick={() => navigate('/login')}>
            Get Started Free
          </AccentButton>
          <p style={{
            marginTop: '16px',
            fontSize: '13px',
            color: '#555'
          }}>
            Free to use. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #1a1a1a',
        padding: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1280px',
        margin: '0 auto',
        color: '#555',
        fontSize: '14px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ fontWeight: '600', color: '#888' }}>Onboardiq</div>
        <div>© 2026 Onboardiq. All rights reserved.</div>
      </footer>
    </div>
  )
}
