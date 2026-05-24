'use client';
import { useEffect, useState, useRef } from 'react';
import { useToast, Toast } from '@/components/Toast';
import { pctColor } from '@/lib/helpers';

const PRESETS = [75, 80, 85, 90];

const DEFAULT_POLICY = {
  removed: [
    'Students must meet Director CRT along with Parents to be added back to the program.',
    'Until then, their status remains REMOVED.',
    'Students must continue attending CRT sections and attendance will continue to be monitored.',
  ],
  redzone: [
    'Students will face limited placement opportunities or restricted placement eligibility.',
    'Students must continue in CRT sections and their attendance will be monitored carefully.',
  ],
};

function PolicyEditor({ show }) {
  const { toast, show: showToast } = useToast();
  const [policy,  setPolicy]  = useState(DEFAULT_POLICY);
  const [draft,   setDraft]   = useState(null);   // null = not editing
  const [saving,  setSaving]  = useState('');      // 'removed' | 'redzone' | ''
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!show) return;
    fetch('/api/policy')
      .then(r => r.json())
      .then(d => { setPolicy(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [show]);

  function startEdit(key) {
    setDraft({ key, lines: [...policy[key]] });
  }

  function setLine(i, val) {
    setDraft(d => ({ ...d, lines: d.lines.map((l, idx) => idx === i ? val : l) }));
  }

  function addLine() {
    setDraft(d => ({ ...d, lines: [...d.lines, ''] }));
  }

  function removeLine(i) {
    setDraft(d => ({ ...d, lines: d.lines.filter((_, idx) => idx !== i) }));
  }

  async function save() {
    setSaving(draft.key);
    try {
      const r = await fetch('/api/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: draft.key, lines: draft.lines }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPolicy(p => ({ ...p, [draft.key]: d.lines }));
      setDraft(null);
      showToast(`${draft.key === 'removed' ? 'Removed' : 'Redzone'} policy updated`);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(''); }
  }

  if (!show) return null;

  const cats = [
    { key: 'removed', label: 'Removed Category', range: 'Below 50%',
      header: 'border-red-200 dark:border-red-800/40 bg-red-100/60 dark:bg-red-900/20',
      dot: 'bg-red-500', title: 'text-red-700 dark:text-red-400', range_cls: 'text-red-500 dark:text-red-400',
      body: 'border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10',
      line: 'text-red-700 dark:text-red-300', dash: 'text-red-300 dark:text-red-700',
      btn: 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30',
    },
    { key: 'redzone', label: 'Redzone Category', range: '50% – 74%',
      header: 'border-amber-200 dark:border-amber-800/40 bg-amber-100/60 dark:bg-amber-900/20',
      dot: 'bg-amber-500', title: 'text-amber-700 dark:text-amber-400', range_cls: 'text-amber-600 dark:text-amber-400',
      body: 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10',
      line: 'text-amber-700 dark:text-amber-300', dash: 'text-amber-300 dark:text-amber-700',
      btn: 'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30',
    },
  ];

  return (
    <div className="mb-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <Toast toast={toast} />
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Edit Category Policies</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
          Changes are saved to the database and reflected on student pages immediately.
        </p>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-sm text-slate-400 text-center">Loading…</div>
      ) : (
        <div className="p-4 grid sm:grid-cols-2 gap-4">
          {cats.map(c => (
            <div key={c.key} className={`rounded-lg overflow-hidden border ${c.body}`}>
              {/* Header */}
              <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${c.header}`}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${c.title}`}>{c.label}</span>
                <span className={`ml-auto text-[10px] font-bold ${c.range_cls}`}>{c.range}</span>
              </div>

              {/* Lines or editor */}
              {draft?.key === c.key ? (
                <div className="px-4 py-3 space-y-2">
                  {draft.lines.map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <textarea
                        rows={2}
                        className="flex-1 text-[11px] px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600
                                   bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 resize-none outline-none
                                   focus:border-blue-400 dark:focus:border-blue-500 transition-colors leading-relaxed"
                        value={line}
                        onChange={e => setLine(i, e.target.value)}
                      />
                      <button
                        onClick={() => removeLine(i)}
                        disabled={draft.lines.length <= 1}
                        className="mt-1 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addLine}
                    className="text-[10px] text-blue-500 dark:text-blue-400 hover:underline">
                    + Add line
                  </button>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={save}
                      disabled={!!saving}
                      className="btn-primary py-1 px-3 text-[11px]">
                      {saving === c.key ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setDraft(null)}
                      className="px-3 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-600
                                 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 space-y-1.5">
                  {policy[c.key].map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`mt-[3px] shrink-0 text-[10px] ${c.dash}`}>—</span>
                      <p className={`text-[11px] leading-relaxed ${c.line}`}>{line}</p>
                    </div>
                  ))}
                  <button
                    onClick={() => startEdit(c.key)}
                    className={`mt-2 text-[10px] font-medium px-2.5 py-1 rounded border transition-colors ${c.btn}`}>
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function downloadExcel(students, threshold) {
  import('xlsx').then(XLSX => {
    const rows = students.map((s, i) => ({
      '#':             i + 1,
      'Name':          s.name,
      'Reg. No.':      s.rollNumber,
      'Branch':        s.branch  || '',
      'Department':    s.dept    || '',
      'CRT Section':   s.crtSec  || '',
      'CRT Room':      s.crtRoom || '',
      'Present':       s.stats.present,
      'Total':         s.stats.total,
      'Absent':        s.stats.absent,
      'Attendance %':  s.stats.pct,
      'Status':        s.stats.pct < 50 ? 'Removed' : s.stats.pct < 75 ? 'Redzone' : 'Warning',
      'Threshold':     `${threshold}%`,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Removal List');
    XLSX.writeFile(wb, `removal_list_${threshold}pct_${new Date().toISOString().slice(0, 10)}.xlsx`);
  });
}

function PctBar({ pct }) {
  const color = pctColor(pct);
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold min-w-[36px] text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function RemovalPage() {
  const { toast, show } = useToast();
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [q, setQ]                 = useState('');
  const [threshold, setThreshold] = useState(85);
  const [customInput, setCustomInput] = useState('');
  const [showEditor, setShowEditor]   = useState(false);
  const customRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/removal?threshold=${threshold}`)
      .then(r => r.json())
      .then(d => { setStudents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(e => { show(e.message, 'error'); setLoading(false); });
  }, [threshold]);

  function applyCustom() {
    const v = parseInt(customInput, 10);
    if (!isNaN(v) && v > 0 && v <= 100) {
      setThreshold(v);
      setCustomInput('');
    }
  }

  const filtered = students.filter(s =>
    !q || s.name.toLowerCase().includes(q.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(q.toLowerCase())
  );

  const critical = filtered.filter(s => s.stats.pct < 50);
  const warning  = filtered.filter(s => s.stats.pct >= 50 && s.stats.pct < 75);

  return (
    <div>
      <Toast toast={toast} />

      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Removal List</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Students with attendance below {threshold}%
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowEditor(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border transition-colors
              ${showEditor
                ? 'bg-slate-800 dark:bg-slate-200 border-slate-800 dark:border-slate-200 text-white dark:text-slate-900'
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
            {showEditor ? 'Hide Editor' : 'Edit Policies'}
          </button>
          <input
            className="form-input text-xs w-48"
            placeholder="Search name or reg. no."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button
            className="btn-outline btn-sm shrink-0"
            disabled={loading || students.length === 0}
            onClick={() => downloadExcel(filtered, threshold)}>
            Download Excel
          </button>
        </div>
      </div>

      {/* Category policy reference */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {/* REMOVED */}
        <div className="rounded-lg overflow-hidden border border-red-200 dark:border-red-800/50
                        bg-red-50 dark:bg-red-900/10">
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-red-200 dark:border-red-800/40
                          bg-red-100/60 dark:bg-red-900/20">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400">
              Removed Category
            </span>
            <span className="ml-auto text-[10px] font-bold text-red-500 dark:text-red-400">Below 50%</span>
          </div>
          <div className="px-4 py-3 space-y-1.5">
            {[
              'Students must meet Director CRT along with Parents to be added back to the program.',
              'Until then, their status remains REMOVED.',
              'Students must continue attending CRT sections and attendance will continue to be monitored.',
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-red-300 dark:text-red-700 mt-[3px] shrink-0 text-[10px]">—</span>
                <p className="text-[11px] leading-relaxed text-red-700 dark:text-red-300">{line}</p>
              </div>
            ))}
          </div>
        </div>

        {/* REDZONE */}
        <div className="rounded-lg overflow-hidden border border-amber-200 dark:border-amber-800/50
                        bg-amber-50 dark:bg-amber-900/10">
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-amber-200 dark:border-amber-800/40
                          bg-amber-100/60 dark:bg-amber-900/20">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              Redzone Category
            </span>
            <span className="ml-auto text-[10px] font-bold text-amber-600 dark:text-amber-400">50% – 74%</span>
          </div>
          <div className="px-4 py-3 space-y-1.5">
            {[
              'Students will face limited placement opportunities or restricted placement eligibility.',
              'Students must continue in CRT sections and their attendance will be monitored carefully.',
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-300 dark:text-amber-700 mt-[3px] shrink-0 text-[10px]">—</span>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Policy editor — collapsible */}
      <PolicyEditor show={showEditor} />

      {/* Threshold selector */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                      rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 shrink-0">
          Threshold:
        </span>

        {/* Preset buttons */}
        <div className="flex gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setThreshold(p)}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors
                ${threshold === p
                  ? 'bg-slate-800 dark:bg-slate-600 text-white border-slate-800 dark:border-slate-600'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
              {p}%
            </button>
          ))}
        </div>

        <span className="text-slate-300 dark:text-slate-600 text-xs">|</span>

        {/* Custom input */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 shrink-0">Custom:</span>
          <input
            ref={customRef}
            type="number"
            min="1"
            max="100"
            className="form-input text-xs w-20 py-1.5"
            placeholder="e.g. 78"
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyCustom()}
          />
          <button
            className="btn-outline btn-sm"
            onClick={applyCustom}>
            Apply
          </button>
        </div>

        {/* Active indicator if not a preset */}
        {!PRESETS.includes(threshold) && (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 ml-1">
            Active: {threshold}%
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          {
            label: 'Below 50% — Removed',
            count: critical.length,
            color: 'text-red-600 dark:text-red-400',
            bg:    'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
          },
          {
            label: `50–74% — Redzone`,
            count: threshold > 75 ? warning.length : 0,
            color: 'text-amber-600 dark:text-amber-400',
            bg:    'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
          },
          {
            label: `Total below ${threshold}%`,
            count: filtered.length,
            color: 'text-slate-800 dark:text-slate-200',
            bg:    'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
          },
        ].map(c => (
          <div key={c.label} className={`border rounded-lg p-4 text-center ${c.bg}`}>
            <div className={`text-3xl font-bold ${c.color}`}>{c.count}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700
                        text-xs text-slate-400 dark:text-slate-500">
          {loading ? 'Loading…' : `${filtered.length} student${filtered.length !== 1 ? 's' : ''} below ${threshold}%`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['#', 'Name', 'Reg. No.', 'Branch', 'Dept', 'CRT Sec', 'Present', 'Total', 'Attendance %', 'Status'].map(h => (
                  <th key={h} className="tbl-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center text-slate-400 py-10 text-sm">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-slate-400 py-10 text-sm">
                    {students.length === 0
                      ? `All students are at or above ${threshold}% — no one at risk.`
                      : 'No results found.'}
                  </td>
                </tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.rollNumber} className="tbl-row">
                  <td className="tbl-cell text-center text-slate-400">{i + 1}</td>
                  <td className="tbl-cell font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
                  <td className="tbl-cell"><span className="badge-purple">{s.rollNumber}</span></td>
                  <td className="tbl-cell">{s.branch || '—'}</td>
                  <td className="tbl-cell">{s.dept   || '—'}</td>
                  <td className="tbl-cell">{s.crtSec || '—'}</td>
                  <td className="tbl-cell text-center font-semibold text-green-700 dark:text-green-400">
                    {s.stats.present}
                  </td>
                  <td className="tbl-cell text-center">{s.stats.total}</td>
                  <td className="tbl-cell"><PctBar pct={s.stats.pct} /></td>
                  <td className="tbl-cell">
                    {s.stats.pct < 50
                      ? <span className="badge-absent">Removed</span>
                      : s.stats.pct < 75
                        ? <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Redzone</span>
                        : <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Warning</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
