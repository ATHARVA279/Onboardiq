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

          const isMultiLine = codeContent.includes('\n')
          const hasLanguageClass = !!match
          const isShort = codeContent.length < 80

          const shouldBeInline = inline || (!isMultiLine && !hasLanguageClass && isShort)

          if (shouldBeInline) {
            return (
              <code
                style={{
                  backgroundColor: 'var(--accent-muted)',
                  color: 'var(--accent-primary)',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  fontSize: '0.85em',
                  fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace',
                  border: '1px solid var(--accent-glow)',
                  whiteSpace: 'nowrap',
                  lineHeight: 'inherit',
                }}
              >
                {codeContent}
              </code>
            )
          }

          return (
            <div
              style={{
                position: 'relative',
                margin: '20px 0',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--bg-hover)',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-tertiary)',
                  fontSize: '11px',
                  padding: '8px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--bg-hover)',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{match ? match[1] : 'code'}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(codeContent)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--bg-hover)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
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
                  padding: '20px',
                  backgroundColor: 'var(--bg-base)',
                  fontSize: '14px',
                  lineHeight: '1.7',
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
                marginBottom: '16px',
                lineHeight: '1.8',
                color: 'var(--text-secondary)',
                fontSize: '15px',
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
                paddingLeft: '24px',
                marginBottom: '12px',
                lineHeight: '1.8',
                listStyleType: 'disc',
                color: 'var(--text-secondary)',
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
                paddingLeft: '24px',
                marginBottom: '12px',
                lineHeight: '1.8',
                listStyleType: 'decimal',
                color: 'var(--text-secondary)',
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
                marginBottom: '6px',
                color: 'var(--text-secondary)',
                fontSize: '15px',
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
                fontSize: '22px',
                fontWeight: '700',
                marginBottom: '12px',
                marginTop: '24px',
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--bg-hover)',
                paddingBottom: '8px',
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
                fontSize: '19px',
                fontWeight: '600',
                marginBottom: '10px',
                marginTop: '20px',
                color: 'var(--text-primary)',
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
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '8px',
                marginTop: '16px',
                color: 'var(--accent-primary)',
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
                borderLeft: '4px solid var(--accent-primary)',
                paddingLeft: '16px',
                marginLeft: 0,
                marginBottom: '14px',
                color: 'var(--text-tertiary)',
                fontStyle: 'italic',
                backgroundColor: 'var(--accent-muted)',
                paddingTop: '8px',
                paddingBottom: '8px',
                borderRadius: '0 8px 8px 0',
              }}
            >
              {children}
            </blockquote>
          )
        },

        strong({ children }) {
          return <strong style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{children}</strong>
        },

        em({ children }) {
          return <em style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{children}</em>
        },

        a({ children, href }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent-primary)',
                textDecoration: 'underline',
                textUnderlineOffset: '4px',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {children}
            </a>
          )
        },

        table({ children }) {
          return (
            <div style={{ overflowX: 'auto', marginBottom: '16px', borderRadius: '8px', border: '1px solid var(--bg-hover)' }}>
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
                borderBottom: '1px solid var(--bg-hover)',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-surface)',
                fontWeight: '600',
                textAlign: 'left',
                color: 'var(--text-primary)',
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
                borderBottom: '1px solid var(--bg-hover)',
                padding: '10px 14px',
                color: 'var(--text-secondary)',
              }}
            >
              {children}
            </td>
          )
        },

        sup({ children }) {
          return (
            <sup style={{ color: 'var(--accent-primary)', fontSize: '0.75em', fontWeight: '600' }}>
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
