import { Message, MessageContent } from '../../lib/api';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolUseBlock } from './ToolUseBlock';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import { User, Bot } from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isToolResult = message.content.every(c => c.type === 'tool_result');

  if (isToolResult) return null;

  return (
    <div className="flex gap-3 px-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
        isUser ? 'bg-[#e8f0eb]' : 'bg-[#7ec8a0]/15'
      }`}>
        {isUser ? <User size={16} className="text-[#6b8578]" /> : <Bot size={16} className="text-[#4da87a]" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-[#2d3d34]">
            {isUser ? 'User' : 'Assistant'}
          </span>
          {message.model && (
            <span className="text-xs text-[#4da87a] font-medium">
              {message.model.replace('claude-', '')}
            </span>
          )}
          {message.timestamp && (
            <span className="text-xs text-[#9aafa3]">
              {formatDate(message.timestamp)}
            </span>
          )}
          {message.output_tokens > 0 && (
            <span className="text-xs text-[#9aafa3]">
              {message.output_tokens.toLocaleString()} tokens
            </span>
          )}
        </div>

        <div className="space-y-2">
          {message.content.map((block, i) => (
            <ContentBlock key={i} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentBlock({ block }: { block: MessageContent }) {
  switch (block.type) {
    case 'text':
      return (
        <div className="markdown-content text-[#3d5248]">
          <MarkdownRenderer content={block.text || ''} />
        </div>
      );
    case 'thinking':
      return <ThinkingBlock thinking={block.thinking || ''} summary={block.summary} />;
    case 'tool_use':
      return <ToolUseBlock name={block.name || ''} input={block.input} id={block.id || ''} />;
    case 'tool_result':
      return (
        <div className={`text-sm rounded-lg p-3 font-mono ${
          block.is_error ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-[#f0f5f2] border border-[#d0ddd5] text-[#6b8578]'
        }`}>
          <div className="text-xs text-[#9aafa3] mb-1">
            {block.is_error ? 'Error' : 'Result'}
          </div>
          <pre className="whitespace-pre-wrap break-all overflow-hidden max-h-96 overflow-y-auto">
            {(block.content || '').slice(0, 8000)}
          </pre>
        </div>
      );
    case 'image':
      return (
        <div className="text-sm text-[#9aafa3] italic">[Image attachment]</div>
      );
    default:
      return null;
  }
}
