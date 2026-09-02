import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, DamageBadge } from '../components/StatusBadge';

const STATUSES = [
  { value: '', label: 'כל הסטטוסים' },
  { value: 'WAITING_FOR_VALIDATION', label: 'ממתין לאימות' },
  { value: 'NEW', label: 'חדש' },
  { value: 'IN_REVIEW', label: 'בבדיקה' },
  { value: 'COMPLETED', label: 'הושלם' },
];

function KPICard({ icon, label, value, sub, color, trend }) {
  return (
    <div className={`card animate-slide-up relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-20 h-20 opacity-10 ${color} rounded-full -mr-8 -mt-8`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium mb-1">{label}</p>
          <p className="text-4xl font-bold text-slate-800 leading-none">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
        </div>
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-2xl shadow-lg`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(100, trend)}%` }} />
          </div>
          <span className="text-xs text-slate-500">{trend}%</span>
        </div>
      )}
    </div>
  );
}

function ReadinessIndicator({ checks }) {
  if (!checks) return null;
  const total = Object.keys(checks).length;
  const passed = Object.values(checks).filter(Boolean).length;
  const pct = Math.round((passed / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2 w-24">
        <div className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pct === 100 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
        {pct}%
      </span>
    </div>
  );
}

function CheckIcon({ ok }) {
  return ok
    ? <span className="text-emerald-500 text-base">✓</span>
    : <span className="text-red-400 text-base">✗</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [stats, setStats] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ settlementId: '', status: '', search: '' });
  const [triggeringSettlement, setTriggeringSettlement] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.settlementId) params.settlementId = filters.settlementId;
      if (filters.status) params.status = filters.status;
      const [bRes, sRes] = await Promise.all([
        api.get('/buildings', { params }),
        api.get('/buildings/settlements'),
      ]);
      setBuildings(bRes.data);
      setSettlements(sRes.data);
      if (user.role === 'MINISTRY') {
        const stRes = await api.get('/buildings/stats');
        setStats(stRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters.settlementId, filters.status, user.role]);

  useEffect(() => { load(); }, [load]);

  const filtered = buildings.filter(b =>
    !filters.search ||
    b.address.includes(filters.search) ||
    b.settlementName.includes(filters.search) ||
    b.reporterName.includes(filters.search)
  );

  async function triggerSettlement(settlementId) {
    setTriggeringSettlement(settlementId);
    try {
      const { data } = await api.post('/settlement-processes/trigger', { settlementId });
      showToast(`תהליך הושק: ${data.message}`);
      setTimeout(load, 3000);
    } catch (e) {
      showToast(e.response?.data?.error || 'שגיאה', 'error');
    } finally {
      setTriggeringSettlement(null);
    }
  }

  const completedPct = stats ? Math.round((stats.completedCount / (stats.total || 1)) * 100) : 0;
  const readyCount = filtered.filter(b => b.isReady).length;

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-white font-medium animate-slide-up
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">לוח בקרה ארצי</h1>
          <p className="text-slate-500 text-sm mt-1">מעקב שיקום מבנים ברחבי הארץ</p>
        </div>
        {user.role === 'MINISTRY' && settlements.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {settlements.map(s => (
              <button key={s.settlementId}
                onClick={() => triggerSettlement(s.settlementId)}
                disabled={triggeringSettlement === s.settlementId}
                className="btn-success text-sm px-4 py-2">
                {triggeringSettlement === s.settlementId
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> עיבוד...</>
                  : `🚀 הפעל ישוב: ${s.settlementName}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards — Ministry only */}
      {user.role === 'MINISTRY' && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon="🏘️" label="סך מבנים" value={stats.total} color="bg-blue-500" />
          <KPICard icon="✅" label="הושלמו" value={stats.completedCount} color="bg-emerald-500" trend={completedPct} />
          <KPICard icon="🔍" label="בבדיקה" value={stats.inReviewCount} color="bg-purple-500" />
          <KPICard icon="⚡" label="מוכן לפתיחה" value={readyCount} sub="עמד בכל הקריטריונים" color="bg-amber-500" />
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input type="text" placeholder="חיפוש לפי כתובת, ישוב, מדווח..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="input pr-9" />
          </div>
          {user.role === 'MINISTRY' && (
            <select value={filters.settlementId}
              onChange={e => setFilters(f => ({ ...f, settlementId: e.target.value }))}
              className="input w-auto min-w-[160px]">
              <option value="">כל הישובים</option>
              {settlements.map(s => <option key={s.settlementId} value={s.settlementId}>{s.settlementName}</option>)}
            </select>
          )}
          <select value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="input w-auto min-w-[160px]">
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-3">{filtered.length} מבנים נמצאו</p>
      </div>

      {/* Buildings Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🏚️</div>
          <p className="text-slate-500 font-medium text-lg">לא נמצאו מבנים</p>
          <p className="text-slate-400 text-sm mt-1">נסה לשנות את הסינון</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(b => (
            <div key={b.id} onClick={() => navigate(`/buildings/${b.id}`)} className="card-hover group">
              {/* Ready indicator ribbon */}
              {b.isReady && (
                <div className="absolute top-0 left-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-br-xl rounded-tl-2xl">
                  ✓ מוכן לפתיחה
                </div>
              )}

              <div className="flex items-start justify-between mb-3 mt-1">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 text-base truncate group-hover:text-blue-700 transition-colors">
                    {b.address}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    🏙️ {b.settlementName} · 👤 {b.reporterName}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>

              {/* Assessment */}
              <div className="flex items-center justify-between mb-3">
                <DamageBadge level={b.assessment?.damageLevel} />
                {b.municipalApproval && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${b.municipalApproval.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {b.municipalApproval.approved ? '✓ אישור עירוני' : '✗ ממתין לאישור'}
                  </span>
                )}
              </div>

              {/* Conditions checklist */}
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { ok: b.hasDamageImages, label: 'תמונות' },
                  { ok: b.hasEngineerReport, label: 'דוח הנדסי' },
                  { ok: b.hasEligibilityCheck, label: 'זכאות' },
                  { ok: b.hasBudgetRequest, label: 'תקציב' },
                  { ok: b.apartmentsCount < 24 || b.hasSocialApproval, label: 'אישור חברתי' },
                  { ok: b.status === 'COMPLETED', label: 'חבילת חזרה' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-1 text-slate-600">
                    <CheckIcon ok={c.ok} />
                    <span className="truncate">{c.label}</span>
                  </div>
                ))}
              </div>

              {/* Readiness progress */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>מוכנות כוללת</span>
                  <span>{b.apartmentsCount} דירות</span>
                </div>
                <ReadinessIndicator checks={b.readinessChecks} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
