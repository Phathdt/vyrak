import ReactMarkdown, { type Components } from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Renders markdown with syntax highlighting for code blocks
 * Uses remark-gfm for GitHub Flavored Markdown (tables, task lists, etc.)
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const components: Components = {
    code({
      inline,
      className,
      children,
      ...props
    }: {
      inline?: boolean
      className?: string
      children?: React.ReactNode
    }) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      const codeContent = String(children).replace(/\n$/, '')

      // Inline code (e.g., `const foo = 'bar'`)
      if (inline) {
        return (
          <code className='inline-code' {...props}>
            {children}
          </code>
        )
      }

      // Code block with syntax highlighting
      if (language) {
        return (
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language}
            PreTag='div'
            customStyle={
              {
                margin: '1rem 0',
                borderRadius: '6px',
                fontSize: '0.875rem',
              } as React.CSSProperties
            }
          >
            {codeContent}
          </SyntaxHighlighter>
        )
      }

      // Code block without language (plain text)
      return (
        <pre className='code-block'>
          <code>{children}</code>
        </pre>
      )
    },

    // Custom link rendering (open external links in new tab)
    a({ href, children, ...props }: { href?: string; children?: React.ReactNode }) {
      const isExternal = href?.startsWith('http')
      return (
        <a
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          {...props}
        >
          {children}
        </a>
      )
    },

    // Table styling
    table({ children, ...props }: { children?: React.ReactNode }) {
      return (
        <div className='table-wrapper'>
          <table {...props}>{children}</table>
        </div>
      )
    },
  }

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
