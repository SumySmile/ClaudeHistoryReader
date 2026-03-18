import { Message, MessageContent, ToolUseAnswerValue, ToolUseQuestion, ToolUseResultData } from '../../lib/api';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolUseBlock } from './ToolUseBlock';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import { User, Bot, MessageCircle, Check, Pencil } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { useState } from 'react';

// Tool names whose results should be shown as user answers
const VISIBLE_TOOL_RESULTS = new Set(['AskUserQuestion']);
type ToolResultBlock = MessageContent & { type: 'tool_result' };

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  // Hide tool-result-only messages UNLESS they contain answers to visible tools
  const isToolResultOnly = message.content.every(c => c.type === 'tool_result');
  const hasVisibleAnswer = message.content.some(
    c => isToolResultBlock(c) && isVisibleToolResult(c)
  );

  if (isToolResultOnly && !hasVisibleAnswer) return null;

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
            <ContentBlock key={i} block={block} role={message.role} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentBlock({ block, role }: { block: MessageContent; role: Message['role'] }) {
  switch (block.type) {
    case 'text': {
      const text = block.text || '';
      // Slash commands (e.g. "/compact args")
      if (role === 'user' && /^\/\S+/.test(text)) {
        return (
          <div className="text-sm text-[#5a9ec8] font-mono bg-[#e8f0eb] rounded px-2 py-1 inline-block">
            {text}
          </div>
        );
      }
      // Interrupted placeholders
      if (role === 'user' && /^\[Request interrupted/i.test(text)) {
        return (
          <div className="text-sm text-[#9aafa3] italic">
            {text}
          </div>
        );
      }
      return <CollapsibleMarkdownBlock text={text} role={role} />;
    }
    case 'thinking':
      return <ThinkingBlock thinking={block.thinking || ''} summary={block.summary} />;
    case 'tool_use':
      return <ToolUseBlock name={block.name || ''} input={block.input} id={block.id || ''} />;
    case 'tool_result':
      if (isVisibleToolResult(block)) {
        return <UserAnswerBlock content={block.content || ''} toolUseResult={block.toolUseResult} />;
      }
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

function UserAnswerBlock({ content, toolUseResult }: { content: string; toolUseResult?: ToolUseResultData }) {
  const items = toolUseResult ? buildAnswerItems(toolUseResult) : [];

  if (items.length > 0) {
    return (
      <div className="rounded-lg border border-[#d0c8a0] bg-[#fdfbf3] p-3">
        <div className="flex items-center gap-1.5 mb-3">
          <MessageCircle size={14} className="text-[#b07840]" />
          <span className="text-xs font-medium text-[#b07840]">User answered Claude's questions</span>
        </div>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="text-sm font-medium text-[#2d3d34]">
                {item.question.header && <span className="text-xs text-[#9aafa3] mr-1.5">[{item.question.header}]</span>}
                {item.question.question}
              </div>

              {item.question.options.length > 0 && (
                <div className="space-y-1 ml-1">
                  {item.question.options.map((option, optionIndex) => {
                    const isSelected = item.selectedOptionLabels.has(normalizeLookupKey(option.label));
                    return (
                      <div
                        key={optionIndex}
                        className={`flex items-start gap-2 text-sm rounded px-2 py-1 border ${
                          isSelected
                            ? 'bg-[#edf7f0] border-[#4da87a]'
                            : 'bg-white border-transparent'
                        }`}
                      >
                        {isSelected ? (
                          <Check size={14} className="text-[#4da87a] mt-0.5 shrink-0" />
                        ) : (
                          <span className="text-[#9aafa3] font-mono text-xs mt-0.5 w-3.5 shrink-0">{optionIndex + 1}.</span>
                        )}
                        <div>
                          <span className={isSelected ? 'text-[#2d6b46] font-medium' : 'text-[#6b8578]'}>{option.label}</span>
                          {option.description && (
                            <span className="text-[#9aafa3] ml-1.5 text-xs"> — {option.description}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {item.customAnswers.length > 0 && (
                <div className="space-y-2 ml-1">
                  {item.customAnswers.map((answer, answerIndex) => (
                    <div key={answerIndex} className="rounded border border-[#d0c8a0] bg-[#fdf6e8] p-2">
                      <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-[#b07840]">
                        <Pencil size={13} />
                        Custom answer
                      </div>
                      <div className="markdown-content text-sm text-[#3d5248]">
                        <MarkdownRenderer content={answer} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {item.notes && (!item.customAnswers.length || item.notes !== item.customAnswers[0]) && (
                <div className="ml-1 border-t border-[#e8e0c8] pt-2 mt-2">
                  <div className="text-xs text-[#9aafa3] mb-1">Notes:</div>
                  <div className="markdown-content text-sm text-[#3d5248]">
                    <MarkdownRenderer content={item.notes} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: plain text display
  return (
    <div className="rounded-lg border border-[#d0c8a0] bg-[#fdfbf3] p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <MessageCircle size={14} className="text-[#b07840]" />
        <span className="text-xs font-medium text-[#b07840]">User answered</span>
      </div>
      <div className="markdown-content text-sm text-[#3d5248]">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}

function buildAnswerItems(toolUseResult: ToolUseResultData) {
  const questions = toolUseResult.questions || [];
  const remainingAnswers = new Map(Object.entries(toolUseResult.answers || {}));

  const items = questions.map((question, index) => {
    const matchKey = findMatchingAnswerKey(question, remainingAnswers, index);
    const rawAnswer = matchKey ? remainingAnswers.get(matchKey) : undefined;
    if (matchKey) remainingAnswers.delete(matchKey);

    const selectedOptionLabels = new Set<string>();
    const customAnswers: string[] = [];

    for (const answer of toAnswerList(rawAnswer)) {
      const matchedOption = findMatchingOptionLabel(question.options || [], answer);
      if (matchedOption) {
        selectedOptionLabels.add(normalizeLookupKey(matchedOption));
      } else if (answer.trim()) {
        customAnswers.push(answer);
      }
    }

    const notes = findMatchingNotes(question, toolUseResult);

    return {
      question,
      selectedOptionLabels,
      customAnswers,
      notes,
    };
  });

  for (const [key, value] of remainingAnswers.entries()) {
    items.push({
      question: { question: key, options: [], multiSelect: Array.isArray(value) },
      selectedOptionLabels: new Set<string>(),
      customAnswers: toAnswerList(value),
      notes: toolUseResult.annotations?.[key]?.notes,
    });
  }

  return items.filter(item => item.selectedOptionLabels.size > 0 || item.customAnswers.length > 0 || item.notes);
}

function findMatchingAnswerKey(question: ToolUseQuestion, answers: Map<string, ToolUseAnswerValue>, index: number): string | undefined {
  if (answers.has(question.question)) return question.question;

  const normalizedQuestion = normalizeLookupKey(question.question);
  for (const key of answers.keys()) {
    const normalizedKey = normalizeLookupKey(key);
    if (!normalizedKey) continue;
    if (normalizedKey === normalizedQuestion || normalizedKey.includes(normalizedQuestion) || normalizedQuestion.includes(normalizedKey)) {
      return key;
    }
  }

  return index < answers.size ? Array.from(answers.keys())[index] : undefined;
}

function findMatchingNotes(question: ToolUseQuestion, toolUseResult: ToolUseResultData): string | undefined {
  if (toolUseResult.annotations?.[question.question]?.notes) {
    return toolUseResult.annotations[question.question]?.notes;
  }

  const normalizedQuestion = normalizeLookupKey(question.question);
  for (const [key, value] of Object.entries(toolUseResult.annotations || {})) {
    const normalizedKey = normalizeLookupKey(key);
    if (!normalizedKey) continue;
    if (normalizedKey === normalizedQuestion || normalizedKey.includes(normalizedQuestion) || normalizedQuestion.includes(normalizedKey)) {
      return value.notes;
    }
  }

  return undefined;
}

function findMatchingOptionLabel(options: ToolUseQuestion['options'], answer: string): string | undefined {
  const normalizedAnswer = normalizeLookupKey(answer);
  if (!normalizedAnswer) return undefined;

  for (const option of options) {
    const normalizedLabel = normalizeLookupKey(option.label);
    if (normalizedLabel === normalizedAnswer) return option.label;
  }

  return undefined;
}

function toAnswerList(value: ToolUseAnswerValue | undefined): string[] {
  if (typeof value === 'string') return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.filter(answer => answer.trim());
  return [];
}

function isToolResultBlock(block: MessageContent): block is ToolResultBlock {
  return block.type === 'tool_result';
}

function isVisibleToolResult(block: ToolResultBlock) {
  if (block.tool_name && VISIBLE_TOOL_RESULTS.has(block.tool_name)) return true;
  return Boolean(block.toolUseResult?.questions?.length || block.toolUseResult?.answers && Object.keys(block.toolUseResult.answers).length > 0);
}

function normalizeLookupKey(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function CollapsibleMarkdownBlock({ text, role }: { text: string; role: Message['role'] }) {
  const [expanded, setExpanded] = useState(false);
  const lineCount = text.split(/\r?\n/).length;
  const isPlanLike = /implement the following plan|^#\s*plan[:：]|计划|方案/i.test(text);
  const shouldCollapse = text.length > 1200 || lineCount > 24 || (role === 'user' && isPlanLike && text.length > 500);

  if (!shouldCollapse) {
    return (
      <div className="markdown-content text-[#3d5248]">
        <MarkdownRenderer content={text} />
      </div>
    );
  }

  return (
    <div>
      <div
        className="markdown-content text-[#3d5248] overflow-hidden"
        style={expanded ? undefined : { display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical' as const }}
      >
        <MarkdownRenderer content={text} />
      </div>
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="mt-1 text-xs text-[#6b8578] hover:text-[#2d3d34] underline underline-offset-2"
      >
        {expanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
  );
}
