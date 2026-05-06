'use client';

interface Props {
  feedback: string;
  score?: number | null;
  compact?: boolean;
}

/** Parse markdown-ish AI feedback into header → content sections. */
type Block =
  | { kind: 'header'; header: string; body: string }
  | { kind: 'list'; header?: string; items: string[] }
  | { kind: 'paragraph'; text: string };

function clean(text: string): string {
  return text.replace(/\*\*/g, '');
}

function parseBlocks(feedback: string): Block[] {
  const paragraphs = feedback.split('\n\n').filter(p => p.trim());
  const blocks: Block[] = [];

  for (const p of paragraphs) {
    if (p.match(/^\s*(?:\*\*)?(?:Admin\s*)?Score:\s*[1-5]\/5(?:\*\*)?[\s.]*$/i)) continue;

    const headerMatch = p.match(/^\*\*([^*]+):\*\*\s*([\s\S]*)/);
    if (headerMatch) {
      const [, header, body] = headerMatch;
      const lines = body.split('\n').filter(Boolean);
      const bullets = lines.filter(l => l.trim().startsWith('-'));
      if (bullets.length > 0) {
        blocks.push({
          kind: 'list',
          header: clean(header),
          items: bullets.map(l => clean(l.replace(/^\s*-\s*/, ''))),
        });
      } else {
        blocks.push({ kind: 'header', header: clean(header), body: clean(body) });
      }
      continue;
    }

    if (p.includes('\n-') || p.startsWith('-')) {
      const lines = p.split('\n');
      const headerLine = lines[0] && !lines[0].startsWith('-') ? clean(lines[0]) : undefined;
      const bullets = lines.filter(l => l.trim().startsWith('-')).map(l => clean(l.replace(/^\s*-\s*/, '')));
      blocks.push({ kind: 'list', header: headerLine, items: bullets });
      continue;
    }

    blocks.push({ kind: 'paragraph', text: clean(p) });
  }

  return blocks;
}

function variantForHeader(header: string): 'good' | 'warn' | 'tip' | 'neutral' {
  const h = header.toLowerCase();
  if (h.includes('strength') || h.includes('did well') || h.includes('great')) return 'good';
  if (h.includes('watch out') || h.includes('improve') || h.includes('careful') || h.includes('tighten')) return 'warn';
  if (h.includes('try this') || h.includes('next time') || h.includes('suggest')) return 'tip';
  return 'neutral';
}

const VARIANT_STYLES = {
  good:    { border: '#86efac', bg: 'var(--good-soft)', ink: 'var(--good)',     icon: '✓' },
  warn:    { border: '#fde68a', bg: 'var(--warn-soft)', ink: 'var(--warn-ink)', icon: '⚠' },
  tip:     { border: 'rgba(234, 88, 12, 0.25)', bg: 'var(--accent-soft)', ink: 'var(--accent)', icon: '☞' },
  neutral: { border: 'var(--rule)', bg: 'var(--paper-2)', ink: 'var(--ink-2)', icon: '•' },
};

function renderBlock(b: Block, idx: number, compact: boolean) {
  const sizeBody = compact ? 'text-[12px]' : 'text-[14px]';
  const sizeHead = compact ? 'text-[13px]' : 'text-[14px]';

  if (b.kind === 'paragraph') {
    return (
      <p key={idx} className={`${sizeBody} text-ink-2 leading-relaxed mb-2.5`}>
        {b.text}
      </p>
    );
  }

  if (b.kind === 'header') {
    const v = VARIANT_STYLES[variantForHeader(b.header)];
    return (
      <div
        key={idx}
        className="rounded-md mb-3 p-3"
        style={{ border: `1px solid ${v.border}`, background: v.bg }}
      >
        <div className={`${sizeHead} font-semibold tracking-tight`} style={{ color: v.ink }}>
          {v.icon} {b.header}
        </div>
        {b.body && (
          <p className={`${sizeBody} mt-1.5 leading-relaxed text-ink`}>{b.body}</p>
        )}
      </div>
    );
  }

  // list
  const v = VARIANT_STYLES[variantForHeader(b.header || '')];
  return (
    <div
      key={idx}
      className="rounded-md mb-3 p-3"
      style={{ border: `1px solid ${v.border}`, background: v.bg }}
    >
      {b.header && (
        <div className={`${sizeHead} font-semibold tracking-tight`} style={{ color: v.ink }}>
          {v.icon} {b.header}
        </div>
      )}
      <ul className={`${sizeBody} list-disc pl-5 mt-1.5 leading-relaxed text-ink space-y-1`}>
        {b.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function scoreSummary(score?: number | null): { color: string; line: string } {
  if (score === undefined || score === null) return { color: 'var(--ink-2)', line: '' };
  if (score >= 4) return { color: 'var(--good)', line: 'Strong response.' };
  if (score >= 3) return { color: 'var(--warn-ink)', line: 'Solid attempt — see below for what to tighten.' };
  return { color: 'var(--bad)', line: "Couple of things to fix — see below, then try again." };
}

export default function FeedbackDisplay({ feedback, score, compact = false }: Props) {
  const blocks = parseBlocks(feedback);
  const summary = scoreSummary(score);

  if (compact) {
    return (
      <div className="border border-rule rounded-md bg-paper overflow-hidden">
        {score !== undefined && score !== null && (
          <div
            className="px-3 py-2 flex items-center justify-between border-b border-rule"
            style={{ background: score >= 4 ? 'var(--good-soft)' : score >= 3 ? 'var(--warn-soft)' : 'var(--bad-soft)' }}
          >
            <span className="text-[11px] uppercase tracking-wide font-medium text-ink-2">AI feedback</span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded"
              style={{
                background: 'var(--paper)',
                color: summary.color,
                border: `1px solid ${summary.color}`,
              }}
            >
              {score}/5
            </span>
          </div>
        )}
        <div className="p-3">{blocks.map((b, i) => renderBlock(b, i, true))}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero score band */}
      {score !== undefined && score !== null && (
        <div
          className="flex items-center gap-4 p-4 border rounded-lg mb-4 shadow-sm"
          style={{
            borderColor:
              score >= 4 ? '#86efac' : score >= 3 ? '#fde68a' : '#fecaca',
            background:
              score >= 4 ? 'var(--good-soft)' : score >= 3 ? 'var(--warn-soft)' : 'var(--bad-soft)',
          }}
        >
          <div className="w-14 h-14 border border-rule rounded-full bg-paper flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-[22px] font-semibold leading-none" style={{ color: summary.color }}>
              {score}
            </span>
            <span className="text-[10px] text-ink-2 mt-0.5">/ 5</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-semibold tracking-tight">{summary.line}</div>
            <div className="text-[13px] text-ink-2 mt-1">Notes from the AI coach below.</div>
          </div>
        </div>
      )}

      {/* Parsed blocks */}
      {blocks.map((b, i) => renderBlock(b, i, false))}
    </div>
  );
}
