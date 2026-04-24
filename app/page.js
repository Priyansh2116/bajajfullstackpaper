'use client';

import { useState } from 'react';

//helper func
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

//icon
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
);

//components
function HierarchyCard({ h }) {
  const isCycle = !!h.has_cycle;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-4 transition-shadow hover:shadow-md">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isCycle ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isCycle ? 'Cycle Detected' : 'Valid Tree'}
          </span>
          <div className="text-sm">
            <span className="text-slate-500 mr-1">Root:</span>
            <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{h.root}</span>
          </div>
        </div>
        {!isCycle && (
          <div className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
            Depth: {h.depth}
          </div>
        )}
      </div>
      
      <div className="p-4">
        {isCycle ? (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p>This group contains a cycle. Nodes reference each other in a loop, meaning a valid tree structure cannot be formed.</p>
          </div>
        ) : (
          <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm font-mono overflow-x-auto shadow-inner leading-relaxed">
            {treeLines(h.tree)}
          </pre>
        )}
      </div>
    </div>
  );
}

const EXAMPLE = `A->B\nA->C\nB->D\nC->E\nE->F\nX->Y\nY->Z\nZ->X\nP->Q\nQ->R\nG->H\nG->H\nG->I\nhello\n1->2\nA->`;

export default function Home() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // API calling 
  async function handleSubmit() {
    setError('');
    setResult(null);
    setLoading(true);
    setCopied(false); 
    
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

  // Copy to clipboard handler
  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 pb-20">
      <div className="max-w-3xl mx-auto px-5 py-12">

        {/* Header */}
        <header className="mb-8 text-center">
          <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold tracking-widest uppercase mb-4 border border-indigo-100">
            SRM Full Stack Challenge
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Node Hierarchy Analyzer
          </h1>
          <p className="mt-3 text-lg text-slate-500">
            Parse directed edges, build valid trees, and detect cyclic groups.
          </p>
        </header>

        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-semibold text-slate-700">
              Input Edges
            </label>
            <button
              type="button"
              onClick={() => setInput(EXAMPLE)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Load Example Data
            </button>
          </div>
          
          <textarea
            className="w-full h-48 rounded-xl border border-slate-300 bg-slate-50 p-4 font-mono text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-y"
            placeholder="A->B&#10;A->C&#10;B->D"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
          />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
            <p className="text-sm text-slate-500">
              Format: <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">A-&gt;B</code> (one per line or comma-separated)
            </p>
            <button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Spinner />}
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>

        {/* Error Block */}
        {error && (
          <div className="mb-8 rounded-xl bg-red-50 p-4 border border-red-200 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Analysis Failed</h3>
              <div className="mt-1 text-sm text-red-700 font-mono">{error}</div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { value: result.summary.total_trees, label: 'Total Trees' },
                { value: result.summary.total_cycles, label: 'Cycles Detected' },
                { value: result.summary.largest_tree_root ?? '—', label: 'Largest Root' },
              ].map(({ value, label }) => (
                <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col items-center justify-center text-center">
                  <div className="text-3xl font-extrabold text-slate-900">{value}</div>
                  <div className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
                </div>
              ))}
            </div>

            {/* Hierarchies */}
            {result.hierarchies.length > 0 && (
              <section className="pt-2">
                <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">Constructed Hierarchies</h2>
                <div>
                  {result.hierarchies.map((h, i) => <HierarchyCard key={i} h={h} />)}
                </div>
              </section>
            )}

            {/* Invalid & Duplicates */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Invalid Entries</h3>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{result.invalid_entries.length}</span>
                </div>
                {result.invalid_entries.length === 0 ? (
                  <span className="text-sm text-slate-400 italic">No invalid entries</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.invalid_entries.map((e, i) => (
                      <span key={i} className="font-mono text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded">
                        {e || '""'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Duplicate Edges</h3>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{result.duplicate_edges.length}</span>
                </div>
                {result.duplicate_edges.length === 0 ? (
                  <span className="text-sm text-slate-400 italic">No duplicates found</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.duplicate_edges.map((e, i) => (
                      <span key={i} className="font-mono text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Metadata & Raw JSON */}
            <div className="grid md:grid-cols-2 gap-6 pt-4">
              <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 h-fit">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Identity Information</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <dt className="text-slate-500 font-medium">User ID</dt>
                    <dd className="font-mono font-medium text-slate-900">{result.user_id}</dd>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <dt className="text-slate-500 font-medium">Email</dt>
                    <dd className="font-medium text-slate-900">{result.email_id}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-slate-500 font-medium">Roll Number</dt>
                    <dd className="font-mono font-medium text-slate-900">{result.college_roll_number}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-slate-900 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                  <span className="text-xs font-mono font-medium text-slate-300">raw_response.json</span>
                  
                  {/* Copy Button */}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-indigo-300 overflow-y-auto max-h-[400px] w-full">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}