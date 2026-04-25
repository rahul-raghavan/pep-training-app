'use client';

import ReactMarkdown from 'react-markdown';
import { ContentBlock as ContentBlockType } from '@/content/types';
import Callout from '@/components/paper/Callout';

interface Props {
  block: ContentBlockType;
}

const CALLOUT_VARIANTS = {
  info: 'tip' as const,
  warning: 'warn' as const,
  tip: 'good' as const,
};

export default function ContentBlock({ block }: Props) {
  switch (block.type) {
    case 'text':
      return (
        <div className="prose max-w-none">
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      );

    case 'callout':
      return (
        <Callout variant={CALLOUT_VARIANTS[block.variant]}>
          <div className="prose max-w-none">
            <ReactMarkdown>{block.content}</ReactMarkdown>
          </div>
        </Callout>
      );

    case 'quote':
      return (
        <blockquote
          className="my-5 px-4 py-3 border-l-[3px] border-rule bg-paper-2 rounded-r-md"
        >
          <p className="text-[16px] italic leading-relaxed text-ink-2">
            &ldquo;{block.content}&rdquo;
          </p>
          {block.attribution && (
            <div className="text-[12px] text-ink-3 mt-2">— {block.attribution}</div>
          )}
        </blockquote>
      );

    case 'table':
      return (
        <div className="overflow-x-auto my-5 border border-rule rounded-md">
          <table className="min-w-full divide-y divide-rule">
            <thead className="bg-paper-2">
              <tr>
                {block.headers.map((header, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left text-[13px] font-semibold text-ink"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 text-[14px] text-ink-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'video': {
      if (block.source === 'youtube') {
        const getYouTubeId = (url: string): string | null => {
          const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
          ];
          for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
          }
          return null;
        };
        const videoId = getYouTubeId(block.url);
        if (!videoId) return <p className="text-bad text-sm">Invalid YouTube URL</p>;
        return (
          <div className="my-5">
            {block.title && (
              <div className="text-[14px] font-semibold mb-2">{block.title}</div>
            )}
            <div className="relative w-full border border-rule rounded-md overflow-hidden" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={block.title || 'Video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        );
      }
      return (
        <div className="my-5">
          {block.title && <div className="text-[14px] font-semibold mb-2">{block.title}</div>}
          <video className="w-full border border-rule rounded-md" controls preload="metadata">
            <source src={block.url} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    default:
      return null;
  }
}
