import { useState } from 'react';
import { Wrench, ChevronDown, ChevronRight, Copy, Check, FileText, Terminal, Search, FolderSearch, Globe, Pencil, HelpCircle } from 'lucide-react';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';

interface Props {
  name: string;
  input: unknown;
  id: string;
}

const TOOL_ICONS: Record<string, typeof Wrench> = {
  Read: FileText, Write: FileText, Edit: Pencil, Bash: Terminal,
  Glob: FolderSearch, Grep: Search, WebFetch: Globe, WebSearch: Globe,
  AskUserQuestion: HelpCircle,
};

const TOOL_COLORS: Record<string, string> = {
  Read: 'text-[#4da87a]',
  Write: 'text-[#5a9ec8]',
  Edit: 'text-[#c5a042]',
  Bash: 'text-[#d08050]',
  Glob: 'text-[#48a8b8]',
  Grep: 'text-[#9878b8]',
  Task: 'text-[#c878a0]',
  WebFetch: 'text-[#6878c0]',
  WebSearch: 'text-[#48a890]',
  AskUserQuestion: 'text-[#b07840]',
};

function getLang(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
    css: 'css', html: 'html', json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', sql: 'sql', sh: 'bash', bat: 'batch', ps1: 'powershell',
    xml: 'xml', toml: 'toml', vue: 'vue', svelte: 'svelte',
  };
  return map[ext] || ext;
}

export function ToolUseBlock({ name, input, id }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const obj = (input && typeof input === 'object') ? input as Record<string, any> : null;
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
  const colorClass = TOOL_COLORS[name] || 'text-[#6b8578]';
  const Icon = TOOL_ICONS[name] || Wrench;
  const preview = getPreview(name, input);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const copyText = name === 'Write' ? obj?.content || inputStr
      : name === 'Bash' ? obj?.command || inputStr : inputStr;
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-[#d0ddd5] rounded-lg overflow-hidden bg-white shadow-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(prev => !prev);
          }
        }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#f0f5f2] transition-colors cursor-pointer"
      >
        <Icon size={14} className={colorClass} />
        <span className={`font-medium ${colorClass}`}>{name}</span>
        {preview && <span className="text-[#9aafa3] truncate flex-1 text-left font-mono text-xs">{preview}</span>}
        <button onClick={handleCopy} className="text-[#9aafa3] hover:text-[#6b8578]" title="Copy">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        {expanded ? <ChevronDown size={14} className="text-[#9aafa3]" /> : <ChevronRight size={14} className="text-[#9aafa3]" />}
      </div>

      {expanded && (
        <div className="border-t border-[#d0ddd5] bg-[#f7faf8]">
          <ToolContent name={name} obj={obj} fallback={inputStr} />
        </div>
      )}
    </div>
  );
}

function ToolContent({ name, obj, fallback }: { name: string; obj: Record<string, any> | null; fallback: string }) {
  if (!obj) return <RawBlock text={fallback} />;
  switch (name) {
    case 'ExitPlanMode': return <ExitPlanContent sendMessageToUser={obj.sendMessageToUser} plan={obj.plan} />;
    case 'Write': return <WriteContent filePath={obj.file_path} content={obj.content} />;
    case 'Edit': return <EditContent filePath={obj.file_path} oldStr={obj.old_string} newStr={obj.new_string} />;
    case 'Bash': return <BashContent command={obj.command} description={obj.description} />;
    case 'Read': return <ReadContent filePath={obj.file_path} offset={obj.offset} limit={obj.limit} />;
    case 'Grep': return <GrepContent pattern={obj.pattern} path={obj.path} glob={obj.glob} />;
    case 'Glob': return <GlobContent pattern={obj.pattern} path={obj.path} />;
    case 'Task': return <TaskContent description={obj.description} prompt={obj.prompt} />;
    case 'WebSearch': return <SimpleField label="Query" value={obj.query} />;
    case 'WebFetch': return <SimpleField label="URL" value={obj.url} />;
    case 'AskUserQuestion': return <AskUserQuestionContent input={obj} />;
    default: return <RawBlock text={fallback} />;
  }
}

function ExitPlanContent({ sendMessageToUser, plan }: { sendMessageToUser?: string; plan?: string }) {
  const messageText = decodeEscapedText(sendMessageToUser || '');
  const planText = decodeEscapedText(plan || '');

  if (!messageText && !planText) {
    return <RawBlock text="No plan content." />;
  }

  return (
    <div className="p-3 space-y-3">
      {messageText && (
        <section className="bg-white border border-[#d0ddd5] rounded-lg p-3">
          <div className="text-xs uppercase tracking-wide text-[#9aafa3] mb-2">Send Message</div>
          <div className="markdown-content text-sm text-[#3d5248]">
            <MarkdownRenderer content={messageText} />
          </div>
        </section>
      )}
      {planText && (
        <section className="bg-white border border-[#d0ddd5] rounded-lg p-3">
          <div className="text-xs uppercase tracking-wide text-[#9aafa3] mb-2">Plan</div>
          <div className="markdown-content text-sm text-[#3d5248] max-h-[560px] overflow-y-auto">
            <MarkdownRenderer content={planText} />
          </div>
        </section>
      )}
    </div>
  );
}

function WriteContent({ filePath, content }: { filePath?: string; content?: string }) {
  const lang = filePath ? getLang(filePath) : '';
  const isMarkdown = lang === 'markdown';
  return (
    <div>
      {filePath && <FileHeader path={filePath} />}
      {content && (
        isMarkdown ? (
          <div className="px-4 py-3 markdown-content text-sm text-[#3d5248] max-h-[500px] overflow-y-auto">
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <pre className="px-4 py-3 text-xs text-[#3d5248] whitespace-pre-wrap break-all max-h-[500px] overflow-y-auto font-mono leading-relaxed">
            {content.slice(0, 15000)}
          </pre>
        )
      )}
    </div>
  );
}

function EditContent({ filePath, oldStr, newStr }: { filePath?: string; oldStr?: string; newStr?: string }) {
  return (
    <div>
      {filePath && <FileHeader path={filePath} />}
      <div className="grid grid-cols-2 divide-x divide-[#d0ddd5]">
        <div className="p-3">
          <div className="text-xs text-red-500 font-medium mb-1.5">- Old</div>
          <pre className="text-xs text-red-700 whitespace-pre-wrap break-all max-h-64 overflow-y-auto font-mono bg-red-50 rounded p-2">
            {(oldStr || '').slice(0, 5000)}
          </pre>
        </div>
        <div className="p-3">
          <div className="text-xs text-[#4da87a] font-medium mb-1.5">+ New</div>
          <pre className="text-xs text-[#2d6b46] whitespace-pre-wrap break-all max-h-64 overflow-y-auto font-mono bg-[#edf7f0] rounded p-2">
            {(newStr || '').slice(0, 5000)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function BashContent({ command, description }: { command?: string; description?: string }) {
  return (
    <div className="p-3">
      {description && <div className="text-xs text-[#9aafa3] mb-2">{description}</div>}
      <div className="bg-[#2d3d34] rounded-lg p-3 font-mono">
        <div className="flex items-center gap-2 text-xs text-[#9aafa3] mb-1.5">
          <span className="text-[#7ec8a0]">$</span> command
        </div>
        <pre className="text-sm text-[#e8f0eb] whitespace-pre-wrap break-all">
          {(command || '').slice(0, 5000)}
        </pre>
      </div>
    </div>
  );
}

function ReadContent({ filePath, offset, limit }: { filePath?: string; offset?: number; limit?: number }) {
  return (
    <div className="p-3">
      {filePath && <FileHeader path={filePath} />}
      {(offset || limit) && (
        <div className="text-xs text-[#9aafa3] mt-1">
          {offset ? `Offset: ${offset}` : ''}{offset && limit ? ' · ' : ''}{limit ? `Limit: ${limit} lines` : ''}
        </div>
      )}
    </div>
  );
}

function GrepContent({ pattern, path, glob }: { pattern?: string; path?: string; glob?: string }) {
  return (
    <div className="p-3 space-y-1.5">
      {pattern && <div className="font-mono text-sm text-[#3d5248]"><span className="text-[#9878b8] text-xs mr-2">pattern</span>{pattern}</div>}
      {path && <div className="text-xs text-[#9aafa3]">Path: {path}</div>}
      {glob && <div className="text-xs text-[#9aafa3]">Glob: {glob}</div>}
    </div>
  );
}

function GlobContent({ pattern, path }: { pattern?: string; path?: string }) {
  return (
    <div className="p-3 space-y-1.5">
      {pattern && <div className="font-mono text-sm text-[#3d5248]"><span className="text-[#48a8b8] text-xs mr-2">pattern</span>{pattern}</div>}
      {path && <div className="text-xs text-[#9aafa3]">Path: {path}</div>}
    </div>
  );
}

function TaskContent({ description, prompt }: { description?: string; prompt?: string }) {
  return (
    <div className="p-3 space-y-2">
      {description && <div className="text-sm font-medium text-[#2d3d34]">{description}</div>}
      {prompt && (
        <div className="text-xs text-[#6b8578] whitespace-pre-wrap max-h-64 overflow-y-auto bg-[#f0f5f2] rounded p-2">
          {prompt.slice(0, 5000)}
        </div>
      )}
    </div>
  );
}

function SimpleField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="p-3">
      <span className="text-xs text-[#9aafa3] mr-2">{label}:</span>
      <span className="text-sm text-[#3d5248]">{value || ''}</span>
    </div>
  );
}

function FileHeader({ path }: { path: string }) {
  const parts = path.replace(/\\/g, '/').split('/');
  const fileName = parts.pop() || '';
  const dir = parts.join('/');
  return (
    <div className="px-3 py-2 bg-[#e8f0eb] text-xs font-mono border-b border-[#d0ddd5]">
      <span className="text-[#9aafa3]">{dir}/</span>
      <span className="text-[#2d3d34] font-medium">{fileName}</span>
    </div>
  );
}

function RawBlock({ text }: { text: string }) {
  return (
    <pre className="px-3 py-2 text-xs text-[#6b8578] whitespace-pre-wrap break-all max-h-96 overflow-y-auto font-mono">
      {text.slice(0, 10000)}
    </pre>
  );
}

function getPreview(name: string, input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const obj = input as Record<string, any>;
  switch (name) {
    case 'ExitPlanMode': return (decodeEscapedText(obj.sendMessageToUser || '').split('\n')[0] || '').slice(0, 80);
    case 'Read': return obj.file_path || '';
    case 'Write': return obj.file_path || '';
    case 'Edit': return obj.file_path || '';
    case 'Bash': return obj.command?.slice(0, 80) || '';
    case 'Glob': return obj.pattern || '';
    case 'Grep': return obj.pattern || '';
    case 'Task': return obj.description || '';
    case 'WebFetch': return obj.url || '';
    case 'WebSearch': return obj.query || '';
    case 'AskUserQuestion': {
      const qs = obj.questions as any[] | undefined;
      if (qs?.length) return qs[0]?.question?.slice(0, 80) || '';
      return '';
    }
    default: return '';
  }
}

function AskUserQuestionContent({ input }: { input: Record<string, any> }) {
  const questions = input.questions as any[] | undefined;
  if (!questions?.length) return <RawBlock text={JSON.stringify(input, null, 2)} />;

  return (
    <div className="p-3 space-y-3">
      {questions.map((q: any, qi: number) => (
        <div key={qi} className="space-y-2">
          <div className="text-sm font-medium text-[#2d3d34]">{q.question}</div>
          {q.options?.length > 0 && (
            <div className="space-y-1">
              {q.options.map((opt: any, oi: number) => (
                <div key={oi} className="flex items-start gap-2 text-sm">
                  <span className="text-[#b07840] font-mono text-xs mt-0.5">{oi + 1}.</span>
                  <div>
                    <span className="text-[#3d5248]">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[#9aafa3] ml-1.5 text-xs">— {opt.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function decodeEscapedText(value: string): string {
  if (!value) return '';
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r');
}
