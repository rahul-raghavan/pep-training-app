'use client';

interface Props {
  sections: {
    id: string;
    title: string;
    status: 'not_started' | 'in_progress' | 'completed';
  }[];
  currentSectionId?: string;
}

export default function ProgressBar({ sections, currentSectionId }: Props) {
  const completedCount = sections.filter(s => s.status === 'completed').length;
  const progressPercent = (completedCount / sections.length) * 100;

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-600">Overall Progress</span>
          <span className="font-medium">{completedCount} of {sections.length} sections</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-1">
        {sections.map((section, index) => {
          const isCurrent = section.id === currentSectionId;
          const isCompleted = section.status === 'completed';
          const isInProgress = section.status === 'in_progress';

          return (
            <div
              key={section.id}
              className={`flex items-center gap-3 p-2 rounded ${
                isCurrent ? 'bg-blue-50' : ''
              }`}
            >
              {/* Status icon */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isInProgress
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}>
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>

              {/* Section title */}
              <span className={`text-sm ${
                isCompleted ? 'text-slate-500' : isCurrent ? 'text-slate-900 font-medium' : 'text-slate-600'
              }`}>
                {section.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
