'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sections } from '@/content/sections';
import { assessmentQuestions, PASSING_SCORE } from '@/content/assessment';
import ContentBlock from '@/components/ContentBlock';
import { Exercise } from '@/content/types';

export default function ContentPreviewPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(sections[0]?.id || null);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/manager/dashboard" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Training Content Preview</h1>
          <p className="text-slate-600">View all training modules and exercises</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Table of Contents */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-lg border border-slate-200 p-4 sticky top-8">
              <h2 className="font-medium text-slate-900 mb-4">Modules ({sections.length})</h2>
              <nav className="space-y-1">
                {sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setExpandedSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      expandedSection === section.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-medium">{index + 1}.</span> {section.title}
                  </button>
                ))}
              </nav>

              {/* Final Assessment */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setExpandedSection('assessment')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    expandedSection === 'assessment'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <span className="font-medium">Final Assessment</span>
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Total modules:</span>
                    <span className="font-medium">{sections.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total exercises:</span>
                    <span className="font-medium">
                      {sections.reduce((sum, s) => sum + s.exercises.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. total time:</span>
                    <span className="font-medium">
                      {Math.round(sections.reduce((sum, s) => sum + s.estimatedMinutes, 0) / 60 * 10) / 10} hrs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {sections.map((section) => (
              <div
                key={section.id}
                className={expandedSection === section.id ? 'block' : 'hidden'}
              >
                <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8">
                  {/* Section header */}
                  <div className="mb-6 pb-6 border-b border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded">
                        Module {sections.findIndex(s => s.id === section.id) + 1}
                      </span>
                      <span className="text-sm text-slate-500">
                        ~{section.estimatedMinutes} min
                      </span>
                    </div>
                    <h1 className="text-2xl font-semibold text-slate-900">{section.title}</h1>
                  </div>

                  {/* Content blocks */}
                  <div className="space-y-6">
                    {section.content.map((block, index) => (
                      <ContentBlock key={index} block={block} />
                    ))}
                  </div>

                  {/* Exercises */}
                  {section.exercises.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-slate-200">
                      <h2 className="text-xl font-semibold text-slate-900 mb-6">
                        Exercises ({section.exercises.length})
                      </h2>

                      <div className="space-y-6">
                        {section.exercises.map((exercise: Exercise, exIndex) => (
                          <div
                            key={exercise.id}
                            className="bg-slate-50 rounded-lg p-6 border border-slate-200"
                          >
                            {exercise.type === 'multiple_choice' && (
                              <>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="bg-slate-200 text-slate-600 text-xs font-medium px-2 py-1 rounded">
                                    Knowledge Check {exIndex + 1}
                                  </span>
                                </div>
                                <h4 className="font-medium text-slate-900 mb-4">
                                  {exercise.question}
                                </h4>
                                <div className="space-y-2 mb-4">
                                  {exercise.options.map((option, optIndex) => (
                                    <div
                                      key={optIndex}
                                      className={`p-3 rounded-lg border ${
                                        optIndex === exercise.correctIndex
                                          ? 'border-green-500 bg-green-50'
                                          : 'border-slate-200 bg-white'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        {optIndex === exercise.correctIndex && (
                                          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                        <span className={optIndex === exercise.correctIndex ? 'text-green-800' : 'text-slate-700'}>
                                          {option}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <div className="text-xs text-blue-600 font-medium mb-1">Explanation</div>
                                  <p className="text-sm text-blue-800">{exercise.explanation}</p>
                                </div>
                              </>
                            )}

                            {exercise.type === 'voice' && (
                              <>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                                    Voice Exercise {exIndex + 1}
                                  </span>
                                </div>
                                <div className="mb-4">
                                  <div className="text-xs text-slate-500 mb-1">Scenario:</div>
                                  <p className="text-slate-900 italic">&ldquo;{exercise.scenario}&rdquo;</p>
                                </div>
                                <div className="mb-4">
                                  <div className="text-xs text-slate-500 mb-1">Guidance (shown to trainee as hint):</div>
                                  <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                                    {exercise.guidance}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">AI Evaluation Prompt (internal):</div>
                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 whitespace-pre-wrap">
                                    {exercise.aiPrompt}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between">
                    {sections.findIndex(s => s.id === section.id) > 0 ? (
                      <button
                        onClick={() => setExpandedSection(sections[sections.findIndex(s => s.id === section.id) - 1].id)}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                    ) : <div />}

                    {sections.findIndex(s => s.id === section.id) < sections.length - 1 ? (
                      <button
                        onClick={() => setExpandedSection(sections[sections.findIndex(s => s.id === section.id) + 1].id)}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : <div />}
                  </div>
                </div>
              </div>
            ))}

            {/* Final Assessment */}
            <div className={expandedSection === 'assessment' ? 'block' : 'hidden'}>
              <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8">
                {/* Assessment header */}
                <div className="mb-6 pb-6 border-b border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded">
                      Final Assessment
                    </span>
                    <span className="text-sm text-slate-500">
                      {assessmentQuestions.length} questions
                    </span>
                  </div>
                  <h1 className="text-2xl font-semibold text-slate-900">Comprehensive Assessment</h1>
                  <p className="text-slate-600 mt-2">
                    Covers all training modules. Passing score: {PASSING_SCORE}/{assessmentQuestions.length} ({Math.round(PASSING_SCORE / assessmentQuestions.length * 100)}%)
                  </p>
                </div>

                {/* Assessment questions */}
                <div className="space-y-6">
                  {assessmentQuestions.map((question, qIndex) => (
                    <div
                      key={question.id}
                      className="bg-slate-50 rounded-lg p-6 border border-slate-200"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-slate-200 text-slate-600 text-xs font-medium px-2 py-1 rounded">
                          Question {qIndex + 1}
                        </span>
                        <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded">
                          {question.module}
                        </span>
                      </div>
                      <h4 className="font-medium text-slate-900 mb-4">
                        {question.question}
                      </h4>
                      <div className="space-y-2 mb-4">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className={`p-3 rounded-lg border ${
                              optIndex === question.correctIndex
                                ? 'border-green-500 bg-green-50'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {optIndex === question.correctIndex && (
                                <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                              <span className={optIndex === question.correctIndex ? 'text-green-800' : 'text-slate-700'}>
                                {option}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-xs text-blue-600 font-medium mb-1">Explanation</div>
                        <p className="text-sm text-blue-800">{question.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
