import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const STATUS_CONFIG = {
  SENT: { label: 'נשלח', cls: 'badge-sent', icon: '✅' },
  FAILED: { label: 'נכשל', cls: 'badge-failed', icon: '❌' },
  ALREADY_SENT: { label: 'נשלח כבר', cls: 'badge-already', icon: '⚠️' },
};

function NotifBadge({ status }) {
  const s = STATUS_CONFIG[status] || { label: status, cls: 'badge-waiting', icon: '?' };
  return <span className={s.cls}>{s.icon} {s.label}</span>;
}

function AttemptDots({ count, maxRetries = 3 }) {
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: maxRetries }).map((_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < count ? 'bg-red-400' : 'bg-slate-200'}`} title={`ניסיון ${i + 1}`} />
      ))}
      <span className="text-xs text-slate-500 mr-1">{count}/{maxRetries}</span>
    </div>
  );
}

export default function NotificationCenter() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sent: 0, failed: 0, alreadySent: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/notifications', { params });
      setLogs(data.logs);
      setTotal(data.total);

      // Stats from all (no filter)
      const all = await api.get('/notifications', { params: { limit: 1000 } });
      const allLogs = all.data.logs;
      setStats({
        sent: allLogs.filter(l => l.status === 'SENT').length,
        failed: allLogs.filter(l => l.status === 'FAILED').length,
        alreadySent: allLogs.filter(l => l.status === 'ALREADY_SENT').length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">מרכז הודעות</h1>
        <p className="text-slate-500 text-sm mt-1">מעקב אחר שליחת הודעות למשפחות | מנגנון Idempotency ו-Retry</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center cursor-pointer hover:shadow-md transition-all" onClick={() => { setStatusFilter('SENT'); setPage(1); }}>
          <div className="text-3xl mb-1">✅</div>
          <div className="text-3xl font-bold text-emerald-600">{stats.sent}</div>
          <div className="text-sm text-slate-500 mt-1">נשלחו בהצלחה</div>
          <div className="mt-2 h-1 bg-emerald-100 rounded-full">
            <div className="h-1 bg-emerald-500 rounded-full" style={{ width: `${(stats.sent / (stats.sent + stats.failed + stats.alreadySent || 1)) * 100}%` }} />
          </div>
        </div>
        <div className="card text-center cursor-pointer hover:shadow-md transition-all" onClick={() => { setStatusFilter('FAILED'); setPage(1); }}>
          <div className="text-3xl mb-1">❌</div>
          <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-sm text-slate-500 mt-1">נכשלו (אחרי {3} ניסיונות)</div>
          <div className="mt-2 h-1 bg-red-100 rounded-full">
            <div className="h-1 bg-red-500 rounded-full" style={{ width: `${(stats.failed / (stats.sent + stats.failed + stats.alreadySent || 1)) * 100}%` }} />
          </div>
        </div>
        <div className="card text-center cursor-pointer hover:shadow-md transition-all" onClick={() => { setStatusFilter('ALREADY_SENT'); setPage(1); }}>
          <div className="text-3xl mb-1">⚠️</div>
          <div className="text-3xl font-bold text-amber-600">{stats.alreadySent}</div>
          <div className="text-sm text-slate-500 mt-1">Idempotency – כבר נשלח</div>
          <div className="mt-2 h-1 bg-amber-100 rounded-full">
            <div className="h-1 bg-amber-500 rounded-full" style={{ width: `${(stats.alreadySent / (stats.sent + stats.failed + stats.alreadySent || 1)) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Idempotency Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔐</span>
          <div>
            <p className="font-semibold mb-1">מנגנון Idempotency פעיל</p>
            <p className="text-blue-600 text-xs">כל הודעה מזוהה על ידי מפתח ייחודי (buildingId + action). ניסיון לשלוח הודעה שכבר נשלחה מוחזר בקוד <code className="bg-blue-100 px-1 rounded">ALREADY_SENT</code> ללא שליחה כפולה. במקרה של כשל, המערכת מנסה שוב עד 3 פעמים.</p>
          </div>
        </div>
      </div>

      {/* Filter + Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-2">
            {[{ v: '', l: 'הכל' }, { v: 'SENT', l: 'נשלחו' }, { v: 'FAILED', l: 'נכשלו' }, { v: 'ALREADY_SENT', l: 'כבר נשלח' }].map(({ v, l }) => (
              <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${statusFilter === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {l}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">{total} רשומות סה"כ</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-2">📭</div>
            <p>אין הודעות</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs">
                    <th className="pb-3 text-right font-medium">סטטוס</th>
                    <th className="pb-3 text-right font-medium">כתובת מבנה</th>
                    <th className="pb-3 text-right font-medium">נמען</th>
                    <th className="pb-3 text-right font-medium">נושא</th>
                    <th className="pb-3 text-right font-medium">ניסיונות</th>
                    <th className="pb-3 text-right font-medium">זמן</th>
                    <th className="pb-3 text-right font-medium">שגיאה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-3 pr-0 pl-4"><NotifBadge status={log.status} /></td>
                      <td className="py-3 pl-4 font-medium text-slate-700 max-w-[150px] truncate">{log.address}</td>
                      <td className="py-3 pl-4 text-slate-500 text-xs">{log.recipientEmail}</td>
                      <td className="py-3 pl-4 text-slate-600 max-w-[200px] truncate text-xs">{log.subject}</td>
                      <td className="py-3 pl-4"><AttemptDots count={log.attemptNumber} /></td>
                      <td className="py-3 pl-4 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 pl-0 text-red-500 text-xs max-w-[160px] truncate" title={log.errorMessage || ''}>
                        {log.errorMessage || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm disabled:opacity-40 hover:bg-slate-200 transition-all">
                  ← הקודם
                </button>
                <span className="text-sm text-slate-500">עמוד {page} מתוך {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm disabled:opacity-40 hover:bg-slate-200 transition-all">
                  הבא →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
