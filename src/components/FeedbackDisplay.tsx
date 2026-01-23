'use client';

interface Props {
  feedback: string;
  score?: number;
  compact?: boolean;
}

export default function FeedbackDisplay({ feedback, score, compact = false }: Props) {
  // Parse the feedback into sections
  const renderFeedback = () => {
    const paragraphs = feedback.split('\n\n').filter(p => p.trim());

    return paragraphs.map((paragraph, idx) => {
      // Remove markdown bold markers for display
      const cleanText = (text: string) => text.replace(/\*\*/g, '');

      // Check if it's a header line (starts with ** or contains **:)
      if (paragraph.match(/^\*\*[^*]+:\*\*/)) {
        const headerMatch = paragraph.match(/^\*\*([^*]+):\*\*\s*([\s\S]*)/);
        if (headerMatch) {
          const [, header, content] = headerMatch;
          return (
            <div key={idx} className={compact ? 'mb-2' : 'mb-3'}>
              <h6 className={`font-semibold text-slate-800 ${compact ? 'text-xs' : 'text-sm'}`}>
                {header}
              </h6>
              {content && (
                <p className={`text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>
                  {cleanText(content)}
                </p>
              )}
            </div>
          );
        }
      }

      // Check for bullet points
      if (paragraph.includes('\n-') || paragraph.startsWith('-')) {
        const lines = paragraph.split('\n');
        const headerLine = lines[0] && !lines[0].startsWith('-') ? lines[0] : null;
        const bullets = lines.filter(l => l.trim().startsWith('-'));

        return (
          <div key={idx} className={compact ? 'mb-2' : 'mb-3'}>
            {headerLine && (
              <h6 className={`font-semibold text-slate-800 ${compact ? 'text-xs mb-1' : 'text-sm mb-1'}`}>
                {cleanText(headerLine)}
              </h6>
            )}
            <ul className={`list-disc list-outside ml-4 space-y-1 text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>
              {bullets.map((line, i) => (
                <li key={i}>{cleanText(line.replace(/^-\s*/, ''))}</li>
              ))}
            </ul>
          </div>
        );
      }

      // Check for score line
      if (paragraph.match(/^\*\*Score:/i)) {
        return null; // Skip - we show score separately
      }

      // Regular paragraph
      return (
        <p key={idx} className={`text-slate-600 ${compact ? 'text-xs mb-2' : 'text-sm mb-3'}`}>
          {cleanText(paragraph)}
        </p>
      );
    });
  };

  if (compact) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {score !== undefined && (
          <div className={`px-3 py-2 flex items-center justify-between ${
            score >= 4 ? 'bg-green-50 border-b border-green-100' :
            score >= 3 ? 'bg-amber-50 border-b border-amber-100' :
            'bg-red-50 border-b border-red-100'
          }`}>
            <span className="text-xs font-medium text-slate-600">AI Feedback</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              score >= 4 ? 'bg-green-100 text-green-700' :
              score >= 3 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {score}/5
            </span>
          </div>
        )}
        <div className="p-3">
          {renderFeedback()}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {score !== undefined && (
        <div className={`px-4 py-3 flex items-center justify-between ${
          score >= 4 ? 'bg-green-50 border-b border-green-100' :
          score >= 3 ? 'bg-amber-50 border-b border-amber-100' :
          'bg-red-50 border-b border-red-100'
        }`}>
          <span className="font-medium text-slate-700">AI Feedback</span>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
            score >= 4 ? 'bg-green-100 text-green-700' :
            score >= 3 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {score}/5
          </div>
        </div>
      )}
      <div className="p-4">
        {renderFeedback()}
      </div>
    </div>
  );
}
