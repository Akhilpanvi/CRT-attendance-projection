'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast, Toast } from '@/components/Toast';

const STATUS_STYLE = {
  OK:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  WARN: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  INFO: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400',
};
const SHEETS = [['checks', 'Health checks'], ['overview', 'Collections'], ['fields', 'Fields'], ['users', 'Users']];
const card = 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl';

function Table({ rows, cols }) {
  if (!rows?.length) return <p className="text-xs text-slate-400 p-4">No rows.</p>;
  cols = cols || Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            {cols.map(c => <th key={c} className="px-3 py-2 font-semibold whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 text-slate-700 dark:text-slate-300">
              {cols.map(c => (
                <td key={c} className="px-3 py-1.5 align-top">
                  {c === 'Status'
                    ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLE[r[c]] || ''}`}>{r[c]}</span>
                    : c === 'Schema type' && r[c] === 'NOT IN SCHEMA'
                      ? <span className="text-amber-600 dark:text-amber-400 font-semibold">{r[c]}</span>
                      : String(r[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DatabasePage() {
  const { toast, show } = useToast();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState('');
  const [coll, setColl]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/database');
      if (!r.ok) throw new Error((await r.json()).error);
      setData(await r.json());
    } catch (e) { show(e.message, 'error'); }
    finally { setLoading(false); }
  }, [show]);

  useEffect(() => { load(); }, [load]);

  // Users are only fetched for downloads (thousands of rows)
  async function download(format, sheet) {
    setBusy(`${format}-${sheet || 'all'}`);
    try {
      let report = data;
      if (!sheet || sheet === 'users') {
        const r = await fetch('/api/admin/database?users=1');
        if (!r.ok) throw new Error((await r.json()).error);
        report = await r.json();
      }
      const XLSX  = await import('xlsx');
      const stamp = new Date().toISOString().slice(0, 10);
      const base  = `db_report_${report.database}_${stamp}`;
      const info  = [{ Database: report.database, 'Generated at': new Date(report.generatedAt).toLocaleString('en-IN') }];

      if (format === 'csv') {
        const ws = XLSX.utils.json_to_sheet(report[sheet]);
        const blob = new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${base}_${sheet}.csv` });
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(info), 'Info');
        for (const [key, label] of SHEETS) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report[key] || []), label);
        XLSX.writeFile(wb, `${base}.xlsx`);
      }
      show('Downloaded');
    } catch (e) { show(e.message, 'error'); }
    finally { setBusy(''); }
  }

  const warns  = data?.checks.filter(c => c.Status === 'WARN').length ?? 0;
  const fields = data?.fields.filter(f => !coll || f.Collection === coll) ?? [];

  return (
    <div className="max-w-6xl">
      <Toast toast={toast} />

      <div className="mb-5 flex items-end gap-3 flex-wrap">
        <div className="mr-auto">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Database</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {data
              ? <>Database <b className="text-slate-700 dark:text-slate-200">{data.database}</b> · checked {new Date(data.generatedAt).toLocaleString('en-IN')}</>
              : 'Collections, fields and data health'}
          </p>
        </div>
        <button className="btn-outline btn-sm" disabled={loading} onClick={load}>{loading ? 'Checking…' : 'Re-check'}</button>
        <button className="btn-primary btn-sm" disabled={!data || !!busy} onClick={() => download('xlsx')}>
          {busy === 'xlsx-all' ? 'Preparing…' : 'Download Excel report'}
        </button>
      </div>

      {!data ? (
        <p className="text-sm text-slate-400 py-16 text-center">{loading ? 'Scanning the database…' : 'No data.'}</p>
      ) : (
        <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <Section title={`Health checks · ${warns ? `${warns} need attention` : 'all good'}`} onCsv={() => download('csv', 'checks')} busy={busy === 'csv-checks'}>
            <Table rows={data.checks} />
          </Section>

          <Section title={`Collections · ${data.overview.length}`} onCsv={() => download('csv', 'overview')} busy={busy === 'csv-overview'}>
            <Table rows={data.overview} />
          </Section>

          <Section
            title={`Fields · ${fields.length}`}
            onCsv={() => download('csv', 'fields')} busy={busy === 'csv-fields'}
            extra={
              <select value={coll} onChange={e => setColl(e.target.value)}
                className="text-xs rounded border border-slate-200 dark:border-slate-600 bg-transparent px-2 py-1 text-slate-600 dark:text-slate-300">
                <option value="">All collections</option>
                {data.overview.map(o => <option key={o.Collection} value={o.Collection}>{o.Collection}</option>)}
              </select>
            }>
            <Table rows={fields} />
          </Section>

          <Section title="Users" onCsv={() => download('csv', 'users')} busy={busy === 'csv-users'}>
            <p className="text-xs text-slate-500 dark:text-slate-400 px-4 pb-4">
              One row per account: role, linked student, last login, last seen and login count. Password hashes and reset tokens are never included.
            </p>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, onCsv, busy, extra, children }) {
  return (
    <div className={card}>
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mr-auto">{title}</div>
        {extra}
        <button className="btn-outline btn-sm" disabled={busy} onClick={onCsv}>{busy ? '…' : 'CSV'}</button>
      </div>
      {children}
    </div>
  );
}
