import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const codeContent = String(children).replace(/\n$/, '')
          const match = /language-(\w+)/.exec(className || '')

          // Multi-signal inline detection:
          // react-markdown passes `inline=true` for backtick spans inside paragraphs.
          // As a defence, also treat single-line, short, no-language-tag code as inline.
          const isMultiLine = codeContent.includes('\n')
          const hasLanguageClass = !!match
          const isShort = codeContent.length < 80

          const shouldBeInline = inline || (!isMultiLine && !hasLanguageClass && isShort)

          if (shouldBeInline) {
            return (
              <code
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  color: '#818cf8',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontSize: '0.85em',
                  fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  whiteSpace: 'nowrap',
                  lineHeight: 'inherit',
                }}
              >
                {codeContent}
              </code>
            )
          }

          // Multi-line code block
          return (
            <div
              style={{
                position: 'relative',
                margin: '16px 0',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                style={{
                  backgroundColor: '#1e1e2e',
                  color: '#6b7280',
                  fontSize: '11px',
                  padding: '6px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span style={{ fontFamily: 'monospace' }}>{match ? match[1] : 'code'}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(codeContent)}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => (e.target.style.color = '#fff')}
                  onMouseLeave={(e) => (e.target.style.color = '#9ca3af')}
                >
                  Copy
                </button>
              </div>
              <SyntaxHighlighter
                style={oneDark}
                language={match ? match[1] : 'text'}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: '#1a1b26',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  borderRadius: 0,
                }}
              >
                {codeContent}
              </SyntaxHighlighter>
            </div>
          )
        },

        p({ children }) {
          return (
            <p
              style={{
                marginTop: 0,
                marginBottom: '14px',
                lineHeight: '1.75',
                color: '#e2e8f0',
                fontSize: '14px',
                wordBreak: 'break-word',
              }}
            >
              {children}
            </p>
          )
        },

        ul({ children }) {
          return (
            <ul
              style={{
                paddingLeft: '20px',
                marginBottom: '10px',
                lineHeight: '1.75',
                listStyleType: 'disc',
              }}
            >
              {children}
            </ul>
          )
        },

        ol({ children }) {
          return (
            <ol
              style={{
                paddingLeft: '20px',
                marginBottom: '10px',
                lineHeight: '1.75',
                listStyleType: 'decimal',
              }}
            >
              {children}
            </ol>
          )
        },

        li({ children }) {
          return (
            <li
              style={{
                marginBottom: '4px',
                color: '#e2e8f0',
                fontSize: '14px',
                display: 'list-item',
              }}
            >
              {children}
            </li>
          )
        },

        h1({ children }) {
          return (
            <h1
              style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '10px',
                marginTop: '18px',
                color: '#f1f5f9',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '6px',
              }}
            >
              {children}
            </h1>
          )
        },

        h2({ children }) {
          return (
            <h2
              style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '8px',
                marginTop: '16px',
                color: '#f1f5f9',
              }}
            >
              {children}
            </h2>
          )
        },

        h3({ children }) {
          return (
            <h3
              style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '6px',
                marginTop: '12px',
                color: '#00ff9c',
              }}
            >
              {children}
            </h3>
          )
        },

        blockquote({ children }) {
          return (
            <blockquote
              style={{
                borderLeft: '3px solid #00ff9c',
                paddingLeft: '12px',
                marginLeft: 0,
                marginBottom: '10px',
                color: '#94a3b8',
                fontStyle: 'italic',
              }}
            >
              {children}
            </blockquote>
          )
        },

        strong({ children }) {
          return <strong style={{ fontWeight: '600', color: '#f1f5f9' }}>{children}</strong>
        },

        em({ children }) {
          return <em style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{children}</em>
        },

        a({ children, href }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#00ff9c',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              {children}
            </a>
          )
        },

        table({ children }) {
          return (
            <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
                {children}
              </table>
            </div>
          )
        },

        th({ children }) {
          return (
            <th
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '8px 12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                fontWeight: '600',
                textAlign: 'left',
                color: '#f1f5f9',
              }}
            >
              {children}
            </th>
          )
        },

        td({ children }) {
          return (
            <td
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '8px 12px',
                color: '#e2e8f0',
              }}
            >
              {children}
            </td>
          )
        },

        sup({ children }) {
          return (
            <sup style={{ color: '#00ff9c', fontSize: '0.75em', fontWeight: '600' }}>
              {children}
            </sup>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
