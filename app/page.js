'use client';

import { useState } from 'react';

function treeLines(obj, prefix = '', isRoot = true) {
  if (isRoot) {
    const entries = Object.entries(obj);
    if (!entries.length) return '';
    const [rootName, children] = entries[0];
    return rootName + '\n' + treeLines(children, '', false);
  }
  return Object.entries(obj)
    .map(([name, children], i, arr) => {
      const isLast = i === arr.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      return prefix + connector + name + '\n' + treeLines(children, childPrefix, false);
    })
    .join('');
}

function HierarchyCard({ h }) {
  const isCycle = !!h.has_cycle;
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${isCycle ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
          {isCycle ? 'cycle' : 'tree'}
        </span>
        <span className="text-stone-400 text-sm">root</span>
        <span className="font-mono font-semibold text-stone-900 text-sm">{h.root}</span>
        {!isCycle && (
          <span className="ml-auto text-xs text-stone-400 tabular-nums">depth {h.depth}</span>
        )}
      </div>
      {isCycle ? (
        <p className="text-sm text-stone-400">
          All nodes appear as children — cyclic group, no tree structure.
        </p>
      ) : (
        <pre className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-sm font-mono text-stone-700 overflow-x-auto leading-6">
          {treeLines(h.tree)}
        </pre>
      )}
    </div>
  );
}

const EXAMPLE = `A->B
A->C
B->D
C->E
E->F
X->Y
Y->Z
Z->X
P->Q
Q->R
G->H
G->H
G->I
hello
1->2
A->`;

export default function Home() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setResult(null);
    setLoading(true);
    const data = input.split(/[\n,]+/).map(s => s.trim());
    try {
      const res = await fetch('/bfhl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message || 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-xl mx-auto px-5 py-16">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">SRM Full Stack Challenge</p>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Node Hierarchy Analyzer</h1>
          <p className="text-sm text-stone-500 mt-1">
            Parses directed edges, builds trees, detects cycles. <span className="font-mono text-stone-400">POST /bfhl</span>
          </p>
        </div>

        {/* Input */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-stone-700">Edges</label>
            <button
              onClick={() => setInput(EXAMPLE)}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              Load example
            </button>
          </div>
          <textarea
            className="w-full h-40 bg-white border border-stone-200 rounded-2xl px-4 py-3 font-mono text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900/20 focus:border-stone-400 resize-none transition-all"
            placeholder={"A->B\nA->C\nB->D"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
          />
          <p className="mt-2 text-xs text-stone-400">
            One edge per line or comma-separated. Format: <span className="font-mono">A-&gt;B</span>
          </p>
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="mt-4 px-5 py-2 bg-stone-900 hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-default"
          >
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: result.summary.total_trees, label: 'Trees' },
                { value: result.summary.total_cycles, label: 'Cycles' },
                { value: result.summary.largest_tree_root ?? '—', label: 'Largest root' },
              ].map(({ value, label }) => (
                <div key={label} className="bg-white border border-stone-200 rounded-2xl px-4 py-4">
                  <div className="text-xl font-semibold text-stone-900 tabular-nums">{value}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Hierarchies */}
            {result.hierarchies.length > 0 && (
              <section>
                <p className="text-xs text-stone-400 uppercase tracking-widest px-1 py-3">
                  Hierarchies
                </p>
                <div className="space-y-3">
                  {result.hierarchies.map((h, i) => <HierarchyCard key={i} h={h} />)}
                </div>
              </section>
            )}

            {/* Invalid + Duplicates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-stone-200 rounded-2xl p-4">
                <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">
                  Invalid <span className="normal-case">({result.invalid_entries.length})</span>
                </p>
                {result.invalid_entries.length === 0 ? (
                  <span className="text-sm text-stone-300">None</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {result.invalid_entries.map((e, i) => (
                      <span key={i} className="font-mono text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded-lg">
                        {e || '""'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl p-4">
                <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">
                  Duplicates <span className="normal-case">({result.duplicate_edges.length})</span>
                </p>
                {result.duplicate_edges.length === 0 ? (
                  <span className="text-sm text-stone-300">None</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {result.duplicate_edges.map((e, i) => (
                      <span key={i} className="font-mono text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg">
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Identity */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4">
              <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">Identity</p>
              <div className="space-y-1 font-mono text-sm text-stone-600">
                <div>{result.user_id}</div>
                <div>{result.email_id}</div>
                <div>{result.college_roll_number}</div>
              </div>
            </div>

            {/* Raw JSON */}
            <details className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
              <summary className="px-4 py-3 text-xs text-stone-400 cursor-pointer hover:text-stone-600 select-none transition-colors">
                Raw JSON
              </summary>
              <pre className="border-t border-stone-100 px-4 py-3 text-xs text-stone-500 overflow-x-auto leading-relaxed">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>

          </div>
        )}

      </div>
    </main>
  );
}
