import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  children: string;
  language: string;
}

export function CodeBlock({ children, language }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2">
      <div className="flex items-center justify-between bg-[#e8ede9] px-4 py-1.5 rounded-t-lg border border-b-0 border-[#d0ddd5]">
        <span className="text-xs text-[#9aafa3]">{language}</span>
        <button
          onClick={handleCopy}
          className="text-[#9aafa3] hover:text-[#3d5248] transition-colors"
          title="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="bg-[#f3f6f4] rounded-b-lg p-4 overflow-x-auto border border-t-0 border-[#d0ddd5]">
        <code className={`language-${language} text-sm leading-relaxed`}>
          {children}
        </code>
      </pre>
    </div>
  );
}
