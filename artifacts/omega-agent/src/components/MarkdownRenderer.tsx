import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { Button } from './ui/Button';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      className="prose prose-invert max-w-none break-words"
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = inline || !match;
          const codeString = String(children).replace(/\n$/, '');
          
          if (isInline) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }

          return <CodeBlock language={match[1]} value={codeString} {...props} />;
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CodeBlock({ language, value }: { language: string, value: string }) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-border/50 my-4 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/80 border-b border-border/50 text-xs text-muted-foreground font-mono">
        <span className="uppercase">{language}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={copyToClipboard}
          title="Kodu kopyala"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus as any}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'rgba(18, 18, 26, 0.8)',
          fontSize: '0.875rem',
        }}
        codeTagProps={{
          style: { fontFamily: 'inherit' }
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
