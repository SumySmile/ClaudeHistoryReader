import { useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  thinking: string;
  summary?: string;
}

export function ThinkingBlock({ thinking, summary }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[#d0ddd5] rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#6b8578] hover:bg-[#f0f5f2] transition-colors"
      >
        <Brain size={14} className="text-[#b08fd0]" />
        <span className="font-medium">Thinking</span>
        {summary && <span className="text-[#9aafa3] truncate flex-1 text-left">— {summary}</span>}
        <span className="text-xs text-[#9aafa3]">{thinking.length.toLocaleString()} chars</span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-[#d0ddd5] bg-[#faf5fe] text-sm text-[#6b8578] whitespace-pre-wrap max-h-[500px] overflow-y-auto leading-relaxed">
          {thinking}
        </div>
      )}
    </div>
  );
}
