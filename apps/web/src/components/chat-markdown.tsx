import { cn } from 'cn'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { Components } from 'react-markdown'

const chatMarkdownComponents: Components = {
  p: ({ className, ...props }) => (
    <p className={cn('text-sm leading-relaxed not-first:mt-2 not-last:mb-0', className)} {...props} />
  ),
  ul: ({ className, ...props }) => <ul className={cn('my-2 list-disc space-y-1 pl-5 text-sm', className)} {...props} />,
  ol: ({ className, ...props }) => (
    <ol className={cn('my-2 list-decimal space-y-1 pl-5 text-sm', className)} {...props} />
  ),
  li: ({ className, ...props }) => <li className={cn('leading-relaxed', className)} {...props} />,
  h1: ({ className, ...props }) => (
    <h1 className={cn('mt-3 mb-2 text-base font-semibold first:mt-0', className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn('mt-3 mb-2 text-sm font-semibold first:mt-0', className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn('mt-2 mb-1 text-sm font-medium first:mt-0', className)} {...props} />
  ),
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
      className={cn('my-2 border-l-2 border-border pl-3 text-sm text-muted-foreground italic', className)}
      {...props}
    />
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = typeof className === 'string' && className.includes('language-')
    if (isBlock) {
      return (
        <code className={cn('block font-mono text-xs leading-relaxed', className)} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className={cn('rounded bg-muted px-1 py-0.5 font-mono text-[0.8125rem]', className)} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ className, ...props }) => (
    <pre className={cn('my-2 max-w-full overflow-x-auto rounded-md bg-muted p-3 text-xs', className)} {...props} />
  ),
  hr: ({ className, ...props }) => <hr className={cn('my-3 border-border', className)} {...props} />,
  table: ({ className, ...props }) => (
    <div className='my-2 max-w-full overflow-x-auto'>
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th className={cn('border border-border bg-muted px-2 py-1 text-left font-medium', className)} {...props} />
  ),
  td: ({ className, ...props }) => (
    <td className={cn('border border-border px-2 py-1 align-top', className)} {...props} />
  ),
}

type ChatMarkdownProps = {
  content: string
  className?: string
}

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div className={cn('chat-markdown break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
