'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ContentBlock from '@/components/ContentBlock';
import { ContentBlock as ContentBlockType, Exercise } from '@/content/types';
import { dbBlockToContentBlock, dbExerciseToExercise } from '@/lib/programs';

interface Section {
  id: string;
  slug: string;
  title: string;
  estimated_minutes: number;
}

export default function ProgramPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;

  const [programTitle, setProgramTitle] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [content, setContent] = useState<ContentBlockType[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    async function fetchProgram() {
      try {
        const [programRes, sectionsRes] = await Promise.all([
          fetch(`/api/programs/${programId}`),
          fetch(`/api/programs/${programId}/sections`),
        ]);
        if (programRes.status === 401) { router.push('/manager'); return; }
        if (!programRes.ok) { router.push('/manager/programs'); return; }
        const programData = await programRes.json();
        const sectionsData = await sectionsRes.json();
        setProgramTitle(programData.program.title);
        setSections(sectionsData.sections || []);
        if (sectionsData.sections?.length > 0) {
          loadSection(sectionsData.sections[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProgram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const loadSection = async (sectionId: string) => {
    setSelectedSection(sectionId);
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/programs/${programId}/sections/${sectionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setContent((data.contentBlocks || []).map(dbBlockToContentBlock));
      setExercises((data.exercises || []).map(dbExerciseToExercise));
    } finally {
      setLoadingContent(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  const currentSection = sections.find(s => s.id === selectedSection);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href={`/manager/programs/${programId}`} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Program
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Preview: {programTitle}</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
        {/* Section sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg border border-slate-200 sticky top-8">
            <div className="p-3 border-b border-slate-200">
              <h2 className="font-medium text-slate-900 text-sm">Sections</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => loadSection(section.id)}
                  className={`w-full text-left p-3 text-sm transition-colors ${
                    selectedSection === section.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs text-slate-400 mr-2">{index + 1}.</span>
                  {section.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content preview */}
        <div className="flex-1">
          {currentSection && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">{currentSection.title}</h2>
              <div className="text-sm text-slate-500 mb-6">{currentSection.estimated_minutes} minutes</div>

              {loadingContent ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {content.map((block, index) => (
                      <ContentBlock key={index} block={block} />
                    ))}
                  </div>

                  {exercises.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <h3 className="text-lg font-medium text-slate-900 mb-4">Exercises ({exercises.length})</h3>
                      <div className="space-y-4">
                        {exercises.map((ex) => (
                          <div key={ex.id} className="bg-slate-50 rounded-lg p-4">
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{ex.type}</span>
                            <p className="text-sm text-slate-700 mt-2 font-medium">
                              {ex.type === 'multiple_choice' && ex.question}
                              {ex.type === 'voice' && ex.scenario}
                              {ex.type === 'short_answer' && ex.question}
                            </p>
                            {ex.type === 'multiple_choice' && (
                              <div className="mt-3 space-y-1.5">
                                {ex.options.map((opt, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${
                                      i === ex.correctIndex
                                        ? 'bg-green-100 text-green-700 font-medium'
                                        : 'bg-white text-slate-400 border border-slate-200'
                                    }`}>
                                      {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className={i === ex.correctIndex ? 'text-green-700' : 'text-slate-600'}>{opt}</span>
                                  </div>
                                ))}
                                {ex.explanation && (
                                  <p className="text-xs text-slate-500 mt-2 pl-7">
                                    <span className="font-medium">Explanation:</span> {ex.explanation}
                                  </p>
                                )}
                              </div>
                            )}
                            {ex.type === 'voice' && (
                              <div className="mt-3 text-sm text-slate-600 space-y-2">
                                <div>
                                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Guidance for trainee</span>
                                  <p className="mt-1 whitespace-pre-wrap">{ex.guidance}</p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">AI evaluation prompt</span>
                                  <p className="mt-1 whitespace-pre-wrap text-slate-500">{ex.aiPrompt}</p>
                                </div>
                              </div>
                            )}
                            {ex.type === 'short_answer' && (
                              <div className="mt-3">
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sample answer</span>
                                <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{ex.sampleAnswer}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
