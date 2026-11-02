import { cn } from 'cn'
import ReactMarkdown from 'react-markdown'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'
import { dark as darkStyle, oneLight as lightStyle } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'

import { useResolvedTheme } from './use-resolved-theme'

import type { Components } from 'react-markdown'

const LANGUAGES = {
  bash,
  css,
  javascript,
  json,
  jsx,
  markdown,
  python,
  sql,
  tsx,
  typescript,
  yaml,
} as const

const LANG_ALIASES: Record<string, keyof typeof LANGUAGES> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  yml: 'yaml',
  md: 'markdown',
  py: 'python',
  node: 'javascript',
  text: 'markdown',
  plaintext: 'markdown',
}

for (const [name, language] of Object.entries(LANGUAGES)) {
  SyntaxHighlighter.registerLanguage(name, language)
}

for (const [alias, target] of Object.entries(LANG_ALIASES)) {
  if (!(alias in LANGUAGES)) {
    SyntaxHighlighter.registerLanguage(alias, LANGUAGES[target])
  }
}

function resolveLanguage(className: string | undefined): string {
  const match = /language-([\w-]+)/.exec(className ?? '')
  const language = match?.[1]?.toLowerCase()
  if (!language) return 'markdown'
  return language in LANGUAGES ? language : 'markdown'
}

const staticComponents: Components = {
  h1: ({ className, ...props }) => (
    <h1
      className={cn('mt-6 mb-3 scroll-mt-20 text-2xl font-semibold tracking-tight first:mt-0', className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn('mt-6 mb-3 scroll-mt-20 border-b border-border pb-1 text-xl font-semibold first:mt-0', className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn('mt-5 mb-2 text-base font-semibold first:mt-0', className)} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={cn('mt-4 mb-2 text-sm font-semibold first:mt-0', className)} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={cn('my-3 text-sm leading-relaxed first:mt-0 last:mb-0', className)} {...props} />
  ),
  ul: ({ className, ...props }) => <ul className={cn('my-3 ml-5 list-disc space-y-1 text-sm', className)} {...props} />,
  ol: ({ className, ...props }) => (
    <ol className={cn('my-3 ml-5 list-decimal space-y-1 text-sm', className)} {...props} />
  ),
  li: ({ className, ...props }) => <li className={cn('leading-relaxed', className)} {...props} />,
  a: ({ className, ...props }) => (
    <a
      className={cn('font-medium text-primary underline underline-offset-2 hover:opacity-90', className)}
      target='_blank'
      rel='noopener noreferrer'
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn('my-3 border-l-2 border-primary/40 pl-4 text-sm text-muted-foreground italic', className)}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => <hr className={cn('my-6 border-border', className)} {...props} />,
  img: ({ className, ...props }) => (
    <img className={cn('my-3 h-auto max-w-full rounded-md', className)} loading='lazy' {...props} />
  ),
  table: ({ className, ...props }) => (
    <div className='my-3 max-w-full overflow-x-auto'>
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th className={cn('border border-border bg-muted px-3 py-2 text-left font-medium', className)} {...props} />
  ),
  td: ({ className, ...props }) => (
    <td className={cn('border border-border px-3 py-2 align-top', className)} {...props} />
  ),
  input: ({ className, ...props }) => (
    <input className={cn('mr-1.5 align-middle accent-primary', className)} {...props} />
  ),
}

type ArtifactMarkdownProps = {
  content: string
  className?: string
}

export function ArtifactMarkdown({ content, className }: ArtifactMarkdownProps) {
  const theme = useResolvedTheme()

  const components: Components = {
    ...staticComponents,
    code: ({ className: codeClassName, children, ...props }) => {
      const isBlock = typeof codeClassName === 'string' && codeClassName.includes('language-')

      if (!isBlock) {
        return (
          <code className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]', codeClassName)} {...props}>
            {children}
          </code>
        )
      }

      return (
        <SyntaxHighlighter
          language={resolveLanguage(codeClassName)}
          style={theme === 'dark' ? darkStyle : lightStyle}
          PreTag='div'
          customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '0.8125rem' }}
          codeTagProps={{ style: { fontFamily: 'inherit' } }}
          wrapLongLines
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      )
    },
    pre: ({ children }) => <div className='my-4 max-w-full overflow-x-auto'>{children}</div>,
  }

  return (
    <div className={cn('break-words text-foreground', className)}>
      {/* react-markdown escapes raw HTML by default — no rehype-raw, so artifact content cannot inject markup. */}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
