'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Question {
  id: string;
  sort_order: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  module_label: string | null;
}

type QuestionForm = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  module_label: string;
};

export default function AssessmentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.programId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>({
    question: '', options: ['', '', '', ''], correct_index: 0, explanation: '', module_label: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/programs/${programId}/assessment`);
      if (res.status === 401) { router.push('/manager'); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const openForm = (q?: Question) => {
    if (q) {
      setEditingId(q.id);
      setForm({ question: q.question, options: [...q.options], correct_index: q.correct_index, explanation: q.explanation, module_label: q.module_label || '' });
    } else {
      setEditingId(null);
      setForm({ question: '', options: ['', '', '', ''], correct_index: 0, explanation: '', module_label: '' });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingId
        ? `/api/programs/${programId}/assessment/${editingId}`
        : `/api/programs/${programId}/assessment`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, module_label: form.module_label || null }),
      });
      if (res.ok) {
        setShowForm(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    await fetch(`/api/programs/${programId}/assessment/${id}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading) {
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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">Assessment Questions ({questions.length})</h1>
            <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Question
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {questions.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            No assessment questions yet.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Q{index + 1}</span>
                      {q.module_label && <span className="text-xs text-slate-400">{q.module_label}</span>}
                    </div>
                    <p className="font-medium text-slate-900 mb-3">{q.question}</p>
                    <div className="space-y-1 text-sm">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`flex items-center gap-2 ${i === q.correct_index ? 'text-green-700 font-medium' : 'text-slate-600'}`}>
                          {i === q.correct_index ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          ) : (
                            <span className="w-4 h-4 inline-block" />
                          )}
                          {opt}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded">{q.explanation}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => openForm(q)} className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                    <button onClick={() => handleDelete(q.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-lg my-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                {editingId ? 'Edit Question' : 'Add Question'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
                  <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Options</label>
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input type="radio" name="correct_answer" checked={form.correct_index === i}
                        onChange={() => setForm({ ...form, correct_index: i })} />
                      <input type="text" value={opt}
                        onChange={(e) => { const o = [...form.options]; o[i] = e.target.value; setForm({ ...form, options: o }); }}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder={`Option ${i + 1}`} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
                  <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Module Label (optional)</label>
                  <input type="text" value={form.module_label} onChange={(e) => setForm({ ...form, module_label: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="e.g. The PEP Belief System" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
