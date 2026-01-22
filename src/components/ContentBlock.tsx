'use client';

import ReactMarkdown from 'react-markdown';
import { ContentBlock as ContentBlockType } from '@/content/types';

interface Props {
  block: ContentBlockType;
}

export default function ContentBlock({ block }: Props) {
  switch (block.type) {
    case 'text':
      return (
        <div className="prose prose-slate max-w-none">
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      );

    case 'callout':
      const variants = {
        info: 'bg-blue-50 border-blue-200 text-blue-900',
        warning: 'bg-amber-50 border-amber-200 text-amber-900',
        tip: 'bg-green-50 border-green-200 text-green-900',
      };
      const icons = {
        info: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        ),
        warning: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ),
        tip: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
          </svg>
        ),
      };
      return (
        <div className={`p-4 rounded-lg border ${variants[block.variant]}`}>
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">{icons[block.variant]}</div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{block.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      );

    case 'quote':
      return (
        <blockquote className="border-l-4 border-slate-300 pl-4 py-2 my-4 bg-slate-50 rounded-r-lg">
          <p className="text-lg italic text-slate-700">{block.content}</p>
          {block.attribution && (
            <footer className="mt-2 text-sm text-slate-500">— {block.attribution}</footer>
          )}
        </blockquote>
      );

    case 'table':
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {block.headers.map((header, i) => (
                  <th key={i} className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3 text-sm text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}
