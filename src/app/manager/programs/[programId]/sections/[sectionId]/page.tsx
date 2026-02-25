'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Section {
  id: string;
  slug: string;
  title: string;
  estimated_minutes: number;
  sort_order: number;
  program_id: string;
}

interface ContentBlockData {
  id: string;
  sort_order: number;
  block_type: string;
  content: string | null;
  variant: string | null;
  headers: string[] | null;
  rows: string[][] | null;
  attribution: string | null;
}

interface ExerciseData {
  id: string;
  sort_order: number;
  exercise_type: string;
  question: string | null;
  options: string[] | null;
  correct_index: number | null;
  explanation: string | null;
  scenario: string | null;
  guidance: string | null;
  ai_prompt: string | null;
  sample_answer: string | null;
}

type EditingBlock = Partial<ContentBlockData> & { block_type: string };
type EditingExercise = Partial<ExerciseData> & { exercise_type: string };

export default function SectionEditorPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;
  const sectionId = params.sectionId as string;

  const [section, setSection] = useState<Section | null>(null);
  const [contentBlocks, setContentBlocks] = useState<ContentBlockData[]>([]);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);

  // Section edit state
  const [editingSection, setEditingSection] = useState(false);
  const [sectionForm, setSectionForm] = useState({ title: '', slug: '', estimated_minutes: 15 });
  const [savingSection, setSavingSection] = useState(false);

  // Content block add/edit state
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState<EditingBlock>({ block_type: 'text' });
  const [savingBlock, setSavingBlock] = useState(false);
  const [videoSource, setVideoSource] = useState<'youtube' | 'uploaded'>('youtube');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Exercise add/edit state
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseForm, setExerciseForm] = useState<EditingExercise>({ exercise_type: 'multiple_choice' });
  const [savingExercise, setSavingExercise] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/programs/${programId}/sections/${sectionId}`);
      if (res.status === 401) { router.push('/manager'); return; }
      if (!res.ok) { router.push(`/manager/programs/${programId}`); return; }
      const data = await res.json();
      setSection(data.section);
      setContentBlocks(data.contentBlocks || []);
      setExercises(data.exercises || []);
      setSectionForm({
        title: data.section.title,
        slug: data.section.slug,
        estimated_minutes: data.section.estimated_minutes,
      });
    } catch {
      router.push(`/manager/programs/${programId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, sectionId]);

  // --- Section handlers ---
  const handleSaveSection = async () => {
    setSavingSection(true);
    try {
      const res = await fetch(`/api/programs/${programId}/sections/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionForm),
      });
      if (res.ok) {
        const data = await res.json();
        setSection(data.section);
        setEditingSection(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!confirm('Delete this section and all its content?')) return;
    await fetch(`/api/programs/${programId}/sections/${sectionId}`, { method: 'DELETE' });
    router.push(`/manager/programs/${programId}`);
  };

  // --- Content block handlers ---
  const openBlockForm = (block?: ContentBlockData) => {
    if (block) {
      setEditingBlockId(block.id);
      setBlockForm({ ...block });
      if (block.block_type === 'video') {
        setVideoSource((block.variant as 'youtube' | 'uploaded') || 'youtube');
      }
    } else {
      setEditingBlockId(null);
      setBlockForm({ block_type: 'text', content: '' });
      setVideoSource('youtube');
    }
    setUploadProgress(null);
    setShowBlockForm(true);
  };

  const handleSaveBlock = async () => {
    setSavingBlock(true);
    try {
      const url = editingBlockId
        ? `/api/programs/${programId}/sections/${sectionId}/content/${editingBlockId}`
        : `/api/programs/${programId}/sections/${sectionId}/content`;
      const method = editingBlockId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockForm),
      });
      if (res.ok) {
        setShowBlockForm(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Delete this content block?')) return;
    await fetch(`/api/programs/${programId}/sections/${sectionId}/content/${blockId}`, { method: 'DELETE' });
    fetchData();
  };

  // --- Exercise handlers ---
  const openExerciseForm = (exercise?: ExerciseData) => {
    if (exercise) {
      setEditingExerciseId(exercise.id);
      setExerciseForm({ ...exercise });
    } else {
      setEditingExerciseId(null);
      setExerciseForm({
        exercise_type: 'multiple_choice',
        question: '',
        options: ['', '', '', ''],
        correct_index: 0,
        explanation: '',
      });
    }
    setShowExerciseForm(true);
  };

  const handleSaveExercise = async () => {
    setSavingExercise(true);
    try {
      const url = editingExerciseId
        ? `/api/programs/${programId}/sections/${sectionId}/exercises/${editingExerciseId}`
        : `/api/programs/${programId}/sections/${sectionId}/exercises`;
      const method = editingExerciseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exerciseForm),
      });
      if (res.ok) {
        setShowExerciseForm(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } finally {
      setSavingExercise(false);
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Delete this exercise?')) return;
    await fetch(`/api/programs/${programId}/sections/${sectionId}/exercises/${exerciseId}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading || !section) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-semibold text-slate-900">{section.title}</h1>
          <span className="text-sm text-slate-500">/{section.slug} &middot; {section.estimated_minutes} min</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Section Settings */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-slate-900">Section Settings</h2>
            {!editingSection ? (
              <button onClick={() => setEditingSection(true)} className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditingSection(false)} className="text-sm text-slate-500">Cancel</button>
                <button onClick={handleSaveSection} disabled={savingSection} className="text-sm text-blue-600">
                  {savingSection ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
          {editingSection ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input type="text" value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input type="text" value={sectionForm.slug} onChange={(e) => setSectionForm({ ...sectionForm, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Minutes</label>
                <input type="number" value={sectionForm.estimated_minutes} onChange={(e) => setSectionForm({ ...sectionForm, estimated_minutes: parseInt(e.target.value) || 15 })}
                  className="w-24 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button onClick={handleDeleteSection} className="text-sm text-red-600 hover:text-red-800">Delete Section</button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Content Blocks */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Content Blocks ({contentBlocks.length})</h2>
            <button onClick={() => openBlockForm()} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Block
            </button>
          </div>
          {contentBlocks.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No content blocks yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {contentBlocks.map((block) => (
                <div key={block.id} className="p-4 flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mr-2">{block.block_type}</span>
                    {block.variant && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded mr-2">{block.variant}</span>}
                    <p className="text-sm text-slate-600 mt-1 truncate">
                      {block.block_type === 'video'
                        ? `${block.variant === 'youtube' ? 'YouTube' : 'Uploaded'}: ${block.attribution || block.content || '(no URL)'}`
                        : block.content ? block.content.substring(0, 120) + (block.content.length > 120 ? '...' : '') : block.block_type === 'table' ? `${(block.headers || []).length} columns` : '(empty)'}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => openBlockForm(block)} className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                    <button onClick={() => handleDeleteBlock(block.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exercises */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Exercises ({exercises.length})</h2>
            <button onClick={() => openExerciseForm()} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Exercise
            </button>
          </div>
          {exercises.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No exercises yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="p-4 flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mr-2">{exercise.exercise_type}</span>
                    <p className="text-sm text-slate-700 mt-1 font-medium">
                      {exercise.question || exercise.scenario || '(no question)'}
                    </p>
                    {exercise.exercise_type === 'multiple_choice' && exercise.options && (
                      <div className="mt-2 space-y-1">
                        {exercise.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${
                              i === exercise.correct_index
                                ? 'bg-green-100 text-green-700 font-medium'
                                : 'bg-slate-50 text-slate-400'
                            }`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className={i === exercise.correct_index ? 'text-green-700' : 'text-slate-600'}>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {exercise.exercise_type === 'voice' && exercise.guidance && (
                      <p className="mt-1 text-xs text-slate-500 truncate">Guidance: {exercise.guidance}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => openExerciseForm(exercise)} className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                    <button onClick={() => handleDeleteExercise(exercise.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Content Block Form Modal */}
      {showBlockForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-lg my-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                {editingBlockId ? 'Edit Content Block' : 'Add Content Block'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={blockForm.block_type}
                    onChange={(e) => setBlockForm({ ...blockForm, block_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="text">Text (Markdown)</option>
                    <option value="callout">Callout</option>
                    <option value="table">Table</option>
                    <option value="quote">Quote</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                {(blockForm.block_type === 'text' || blockForm.block_type === 'callout' || blockForm.block_type === 'quote') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Content (Markdown)</label>
                    <textarea
                      value={blockForm.content || ''}
                      onChange={(e) => setBlockForm({ ...blockForm, content: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                      rows={8}
                    />
                  </div>
                )}

                {blockForm.block_type === 'callout' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Variant</label>
                    <select
                      value={blockForm.variant || 'info'}
                      onChange={(e) => setBlockForm({ ...blockForm, variant: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="tip">Tip</option>
                    </select>
                  </div>
                )}

                {blockForm.block_type === 'quote' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Attribution</label>
                    <input
                      type="text"
                      value={blockForm.attribution || ''}
                      onChange={(e) => setBlockForm({ ...blockForm, attribution: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                )}

                {blockForm.block_type === 'table' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Headers (JSON array)</label>
                      <input
                        type="text"
                        value={JSON.stringify(blockForm.headers || [])}
                        onChange={(e) => { try { setBlockForm({ ...blockForm, headers: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                        placeholder='["Column 1", "Column 2"]'
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Rows (JSON 2D array)</label>
                      <textarea
                        value={JSON.stringify(blockForm.rows || [], null, 2)}
                        onChange={(e) => { try { setBlockForm({ ...blockForm, rows: JSON.parse(e.target.value) }); } catch { /* ignore */ } }}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                        rows={4}
                        placeholder='[["Row 1 Col 1", "Row 1 Col 2"]]'
                      />
                    </div>
                  </>
                )}

                {blockForm.block_type === 'video' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Video Source</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="videoSource"
                            checked={videoSource === 'youtube'}
                            onChange={() => {
                              setVideoSource('youtube');
                              setBlockForm({ ...blockForm, variant: 'youtube', content: '' });
                            }}
                          />
                          <span className="text-sm text-slate-700">YouTube URL</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="videoSource"
                            checked={videoSource === 'uploaded'}
                            onChange={() => {
                              setVideoSource('uploaded');
                              setBlockForm({ ...blockForm, variant: 'uploaded', content: '' });
                            }}
                          />
                          <span className="text-sm text-slate-700">Upload File</span>
                        </label>
                      </div>
                    </div>

                    {videoSource === 'youtube' ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">YouTube URL</label>
                        <input
                          type="url"
                          value={blockForm.content || ''}
                          onChange={(e) => setBlockForm({ ...blockForm, content: e.target.value, variant: 'youtube' })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Video File</label>
                        {blockForm.content ? (
                          <div className="space-y-2">
                            <p className="text-sm text-green-600">Video uploaded successfully</p>
                            <p className="text-xs text-slate-500 truncate">{blockForm.content}</p>
                            <button
                              type="button"
                              onClick={() => setBlockForm({ ...blockForm, content: '' })}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Remove & upload different file
                            </button>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
                              disabled={uploadingVideo}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingVideo(true);
                                setUploadProgress('Uploading video...');
                                try {
                                  const formData = new FormData();
                                  formData.append('video', file);
                                  const res = await fetch(`/api/programs/${programId}/upload-video`, {
                                    method: 'POST',
                                    body: formData,
                                  });
                                  if (!res.ok) {
                                    const data = await res.json();
                                    alert(data.error || 'Upload failed');
                                    return;
                                  }
                                  const data = await res.json();
                                  setBlockForm({ ...blockForm, content: data.url, variant: 'uploaded' });
                                  setUploadProgress('Upload complete!');
                                } catch {
                                  alert('Failed to upload video');
                                } finally {
                                  setUploadingVideo(false);
                                }
                              }}
                              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                            />
                            {uploadProgress && (
                              <p className="text-xs text-blue-600 mt-1">{uploadProgress}</p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">MP4, WebM, or MOV. Max 100MB.</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Title (optional)</label>
                      <input
                        type="text"
                        value={blockForm.attribution || ''}
                        onChange={(e) => setBlockForm({ ...blockForm, attribution: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="Video title shown above the player"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowBlockForm(false)} className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={handleSaveBlock} disabled={savingBlock} className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
                  {savingBlock ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Form Modal */}
      {showExerciseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-lg my-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                {editingExerciseId ? 'Edit Exercise' : 'Add Exercise'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={exerciseForm.exercise_type}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, exercise_type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="voice">Voice</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                {exerciseForm.exercise_type === 'multiple_choice' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
                      <textarea value={exerciseForm.question || ''} onChange={(e) => setExerciseForm({ ...exerciseForm, question: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={3} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Options</label>
                      {(exerciseForm.options || ['', '', '', '']).map((opt, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2">
                          <input
                            type="radio"
                            name="correct"
                            checked={exerciseForm.correct_index === i}
                            onChange={() => setExerciseForm({ ...exerciseForm, correct_index: i })}
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...(exerciseForm.options || ['', '', '', ''])];
                              newOptions[i] = e.target.value;
                              setExerciseForm({ ...exerciseForm, options: newOptions });
                            }}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                            placeholder={`Option ${i + 1}`}
                          />
                        </div>
                      ))}
                      <p className="text-xs text-slate-500">Select the radio button next to the correct answer.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
                      <textarea value={exerciseForm.explanation || ''} onChange={(e) => setExerciseForm({ ...exerciseForm, explanation: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={3} />
                    </div>
                  </>
                )}

                {exerciseForm.exercise_type === 'voice' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Scenario</label>
                      <textarea value={exerciseForm.scenario || ''} onChange={(e) => setExerciseForm({ ...exerciseForm, scenario: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={3} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Guidance</label>
                      <textarea value={exerciseForm.guidance || ''} onChange={(e) => setExerciseForm({ ...exerciseForm, guidance: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={3} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">AI Prompt</label>
                      <textarea value={exerciseForm.ai_prompt || ''} onChange={(e) => setExerciseForm({ ...exerciseForm, ai_prompt: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={3} />
                    </div>
                  </>
                )}

                {exerciseForm.exercise_type === 'short_answer' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
                      <textarea value={exerciseForm.question || ''} onChange={(e) => setExerciseForm({ ...exerciseForm, question: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={3} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sample Answer</label>
                      <textarea value={exerciseForm.sample_answer || ''} onChange={(e) => setExerciseForm({ ...exerciseForm, sample_answer: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={3} />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowExerciseForm(false)} className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={handleSaveExercise} disabled={savingExercise} className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
                  {savingExercise ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
