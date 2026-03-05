import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { CodeBlock } from './CodeBlock';

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ children, className, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !className;
          if (isInline) {
            return <code className="bg-[#e8f0eb] text-[#3a6b50] px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
          }
          return (
            <CodeBlock language={match?.[1] || ''}>
              {String(children).replace(/\n$/, '')}
            </CodeBlock>
          );
        },
        pre({ children }) {
          return <>{children}</>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
