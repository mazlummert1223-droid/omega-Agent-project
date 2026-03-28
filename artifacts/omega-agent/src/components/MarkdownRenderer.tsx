import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-white text-muted-foreground"
      title="Kopyala"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks (pre > code)
          pre({ children }) {
            const child = React.Children.toArray(children)[0] as React.ReactElement<any>;
            const className = child?.props?.className || '';
            const match = /language-(\w+)/.exec(className);
            const language = match ? match[1] : 'text';
            const code = String(child?.props?.children ?? '').replace(/\n$/, '');

            return (
              <div className="relative group rounded-xl overflow-hidden border border-border/50 my-3 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between px-4 py-2 bg-secondary/80 border-b border-border/50 text-xs text-muted-foreground font-mono">
                  <span className="uppercase tracking-wider">{language}</span>
                  <CopyButton text={code} />
                </div>
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'rgba(10, 12, 20, 0.9)',
                    fontSize: '0.85rem',
                    lineHeight: '1.6',
                  }}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          },
          // Inline code
          code({ children, className }) {
            const isBlock = className?.startsWith('language-');
            if (isBlock) return <code className={className}>{children}</code>;
            return (
              <code className="bg-secondary/80 text-primary/90 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-border/30">
                {children}
              </code>
            );
          },
          // Links
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {children}
              </a>
            );
          },
          // Images
          img({ src, alt }) {
            return (
              <img
                src={src}
                alt={alt || ''}
                className="rounded-xl max-w-full my-3 shadow-lg border border-border/30"
                loading="lazy"
              />
            );
          },
          // Tables
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="bg-secondary/80 text-white font-semibold px-3 py-2 text-left border border-border text-xs uppercase tracking-wider">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3 py-2 border border-border text-foreground/80 text-sm">
                {children}
              </td>
            );
          },
          // Blockquote
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-primary/40 pl-4 italic text-muted-foreground my-3">
                {children}
              </blockquote>
            );
          },
          // Headings - no uppercase/tracking override
          h1({ children }) { return <h1 className="text-xl font-bold text-white mt-5 mb-2 normal-case tracking-normal">{children}</h1>; },
          h2({ children }) { return <h2 className="text-lg font-bold text-white mt-4 mb-2 normal-case tracking-normal">{children}</h2>; },
          h3({ children }) { return <h3 className="text-base font-semibold text-white mt-3 mb-1.5 normal-case tracking-normal">{children}</h3>; },
          h4({ children }) { return <h4 className="text-sm font-semibold text-white mt-2 mb-1 normal-case tracking-normal">{children}</h4>; },
          // Paragraphs
          p({ children }) { return <p className="mb-3 leading-relaxed text-foreground/90 last:mb-0">{children}</p>; },
          // Lists
          ul({ children }) { return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>; },
          ol({ children }) { return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>; },
          li({ children }) { return <li className="text-foreground/85">{children}</li>; },
          // Strong / em
          strong({ children }) { return <strong className="text-white font-semibold">{children}</strong>; },
          em({ children }) { return <em className="text-foreground/80 italic">{children}</em>; },
          // HR
          hr() { return <hr className="border-border my-4" />; },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
