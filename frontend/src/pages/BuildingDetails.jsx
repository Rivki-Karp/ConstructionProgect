import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, DamageBadge } from '../components/StatusBadge';

const ACTION_LABELS = {
  BUILDING_CREATED: { label: 'מבנה נוצר', icon: '🏗️', color: 'bg-blue-500' },
  ASSESSMENT_CREATED: { label: 'הערכת נזק הוגשה', icon: '📋', color: 'bg-purple-500' },
  MUNICIPAL_APPROVAL_GRANTED: { label: 'אישור עירוני ניתן', icon: '✅', color: 'bg-emerald-500' },
  MUNICIPAL_APPROVAL_UPDATED: { label: 'אישור עירוני עודכן', icon: '🔄', color: 'bg-amber-500' },
  STATUS_UPDATED: { label: 'סטטוס עודכן', icon: '📊', color: 'bg-slate-500' },
  CONDITIONS_UPDATED: { label: 'תנאים עודכנו', icon: '📝', color: 'bg-indigo-500' },
  RETURN_HOME_PACKAGE_SENT: { label: 'חבילת חזרה נשלחה', icon: '📬', color: 'bg-teal-500' },
};

function SectionCard({ title, icon, children }) {
  return (
    <div className="card animate-slide-up">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
        <span className="text-xl">{icon}</span>
        <h2 className="font-bold text-slate-800 text-lg">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ConditionRow({ label, ok, icon }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${ok ? 'bg-emerald-50' : 'bg-red-50'}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${ok ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-700'}`}>
        {ok ? '✓ קיים' : '✗ חסר'}
      </span>
    </div>
  );
}

function ReadinessPanel({ checks, isReady }) {
  if (!checks) return null;
  const labels = {
    hasDamageImages: { label: 'תמונות נזק', icon: '📸' },
    hasEngineerReport: { label: 'דוח הנדסי', icon: '🔧' },
    hasEligibilityCheck: { label: 'בדיקת זכאות', icon: '📄' },
    hasBudgetRequest: { label: 'בקשת תקציב', icon: '💰' },
    hasSocialApproval: { label: 'אישור חברתי (24+ דירות)', icon: '👥' },
    hasRelocationPackage: { label: 'חבילת פינוי', icon: '📦' },
    damageOk: { label: 'נזק קל/בינוני בלבד', icon: '🏚️' },
    municipalApproved: { label: 'אישור עירוני', icon: '🏛️' },
  };
  return (
    <div className={`p-4 rounded-2xl border-2 ${isReady ? 'border-emerald-300 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{isReady ? '🟢' : '🟡'}</span>
        <span className={`font-bold text-base ${isReady ? 'text-emerald-700' : 'text-amber-700'}`}>
          {isReady ? 'מוכן לפתיחת ישוב!' : 'לא עמד בכל הקריטריונים'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(checks).map(([k, v]) => (
          <div key={k} className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${v ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
            <span>{labels[k]?.icon}</span>
            <span className="flex-1">{labels[k]?.label || k}</span>
            <span>{v ? '✓' : '✗'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BuildingDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [sendingPackage, setSendingPackage] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showConditionsForm, setShowConditionsForm] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/buildings/${id}`);
      setBuilding(data);
    } catch (e) {
      if (e.response?.status === 404) navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  async function sendPackage() {
    setSendingPackage(true);
    try {
      const { data } = await api.post(`/settlement-processes/send-package/${id}`);
      showToast(
        data.status === 'SENT' ? '✅ חבילת חזרה לבית נשלחה בהצלחה!' :
        data.status === 'ALREADY_SENT' ? '⚠️ ההודעה כבר נשלחה בעבר (Idempotency)' :
        `⚠️ שליחה נכשלה: ${data.notificationLog?.errorMessage}`,
        data.status === 'SENT' ? 'success' : 'error'
      );
      await load();
    } catch (e) {
      showToast(e.response?.data?.error || 'שגיאה', 'error');
    } finally {
      setSendingPackage(false);
    }
  }

  async function updateStatus(status) {
    try {
      await api.patch(`/buildings/${id}/status`, { status });
      showToast('סטטוס עודכן בהצלחה');
      await load();
    } catch (e) { showToast(e.response?.data?.error || 'שגיאה', 'error'); }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!building) return null;

  const latestAssessment = building.assessments?.[0];

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-white font-medium animate-slide-up
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Back + Header */}
      <div>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-4 transition-colors">
          ← חזרה ללוח הבקרה
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{building.address}</h1>
            <p className="text-slate-500 text-sm mt-1">🏙️ {building.settlementName} · 👤 {building.reporterName} · ✉️ {building.familyEmail}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={building.status} />
            <DamageBadge level={latestAssessment?.damageLevel} />
          </div>
        </div>
      </div>

      {/* Readiness Banner */}
      <ReadinessPanel checks={building.readinessChecks} isReady={building.isReady} />

      {/* CTA Buttons */}
      {user.role === 'MINISTRY' && (
        <div className="flex flex-wrap gap-3">
          <button onClick={sendPackage} disabled={sendingPackage}
            className="btn-success">
            {sendingPackage
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> שולח...</>
              : '📬 שלח חבילת חזרה לבית'}
          </button>
          <select onChange={e => e.target.value && updateStatus(e.target.value)} defaultValue=""
            className="input w-auto text-sm">
            <option value="">🔄 שנה סטטוס...</option>
            <option value="WAITING_FOR_VALIDATION">ממתין לאימות</option>
            <option value="NEW">חדש</option>
            <option value="IN_REVIEW">בבדיקה</option>
            <option value="COMPLETED">הושלם</option>
          </select>
          <button onClick={() => setShowConditionsForm(v => !v)} className="btn-secondary text-sm">
            📝 עדכון תנאים
          </button>
        </div>
      )}

      {/* Conditions Update Form */}
      {showConditionsForm && <ConditionsForm building={building} onSave={async (data) => {
        await api.patch(`/buildings/${id}/conditions`, data);
        showToast('תנאים עודכנו'); setShowConditionsForm(false); await load();
      }} />}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Engineering Conditions */}
        <SectionCard title="תנאי הנדסה ותשתית" icon="🔧">
          <div className="space-y-2">
            <ConditionRow label="תמונות נזק" ok={!!building.hasDamageImages} icon="📸" />
            <ConditionRow label="דוח הנדסי" ok={!!building.hasEngineerReport} icon="📋" />
            <ConditionRow label="בדיקת זכאות" ok={!!building.hasEligibilityCheck} icon="✔️" />
            <ConditionRow label={`בקשת תקציב`} ok={!!building.hasBudgetRequest} icon="💰" />
            <ConditionRow label={`אישור חברתי (${building.apartmentsCount} דירות)`}
              ok={building.apartmentsCount < 24 || !!building.hasSocialApproval} icon="👥" />
          </div>
        </SectionCard>

        {/* Municipal Approval */}
        <SectionCard title="אישור עירוני" icon="🏛️">
          {building.municipalApproval ? (
            <div className="space-y-2">
              <ConditionRow label="מים" ok={!!building.municipalApproval.waterOk} icon="💧" />
              <ConditionRow label="חשמל" ok={!!building.municipalApproval.electricityOk} icon="⚡" />
              <ConditionRow label="דרכי גישה" ok={!!building.municipalApproval.accessRoadsOk} icon="🛣️" />
              <ConditionRow label="פינוי מפגעים" ok={!!building.municipalApproval.hazardRemovalOk} icon="⚠️" />
              <div className={`mt-3 p-3 rounded-xl text-sm font-medium ${building.municipalApproval.approved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                {building.municipalApproval.approved ? '✅ מאושר על ידי הרשות המקומית' : '❌ טרם קיבל אישור עירוני'}
                {building.municipalApproval.approvalDate && <span className="block text-xs opacity-75 mt-1">תאריך: {building.municipalApproval.approvalDate}</span>}
                {building.municipalApproval.notes && <span className="block text-xs opacity-75 mt-1">הערות: {building.municipalApproval.notes}</span>}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">🏛️</div>
              <p>טרם הוגשה בדיקת תשתית עירונית</p>
            </div>
          )}
          {user.role === 'MUNICIPALITY' && (
            <button onClick={() => setShowApprovalForm(v => !v)} className="btn-primary mt-4 w-full justify-center">
              {showApprovalForm ? 'סגור טופס' : '+ הגש בדיקת תשתית'}
            </button>
          )}
          {showApprovalForm && <ApprovalForm buildingId={id} onSave={async (data) => {
            await api.post('/municipal-approvals', { buildingId: id, ...data });
            showToast('בדיקת תשתית נשמרה'); setShowApprovalForm(false); await load();
          }} />}
        </SectionCard>
      </div>

      {/* Assessments */}
      <SectionCard title="הערכות נזק" icon="📋">
        {building.assessments?.length > 0 ? (
          <div className="space-y-3">
            {building.assessments.map(a => (
              <div key={a.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0
                  ${a.damageLevel === 'MINOR' ? 'bg-green-100' : a.damageLevel === 'MODERATE' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                  {a.damageLevel === 'MINOR' ? '🟢' : a.damageLevel === 'MODERATE' ? '🟡' : '🔴'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <DamageBadge level={a.damageLevel} />
                    <span className="text-xs text-slate-400">{a.inspectionDate}</span>
                  </div>
                  <p className="text-sm text-slate-700">{a.notes || 'אין הערות'}</p>
                  <p className="text-xs text-slate-400 mt-1">שמאי: {a.appraiserName}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">📋</div>
            <p>טרם הוגשה הערכת נזק</p>
          </div>
        )}
        {user.role === 'APPRAISER' && (
          <button onClick={() => setShowAssessmentForm(v => !v)} className="btn-primary mt-4 w-full justify-center">
            {showAssessmentForm ? 'סגור טופס' : '+ הגש הערכת נזק חדשה'}
          </button>
        )}
        {showAssessmentForm && <AssessmentForm buildingId={id} onSave={async (data) => {
          await api.post('/assessments', { buildingId: id, ...data });
          showToast('הערכת נזק נשמרה'); setShowAssessmentForm(false); await load();
        }} />}
      </SectionCard>

      {/* Audit Trail */}
      <SectionCard title="היסטוריית פעולות" icon="📜">
        {building.auditLog?.length > 0 ? (
          <div className="relative">
            <div className="absolute right-5 top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="space-y-4">
              {building.auditLog.map((log, i) => {
                const meta = ACTION_LABELS[log.action] || { label: log.action, icon: '📌', color: 'bg-slate-500' };
                return (
                  <div key={log.id} className="flex gap-4 relative animate-fade-in">
                    <div className={`w-10 h-10 ${meta.color} rounded-full flex items-center justify-center text-lg flex-shrink-0 shadow-sm z-10`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 mb-1">
                        <span className="font-semibold text-slate-800 text-sm">{meta.label}</span>
                        {log.userName && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {log.userName} ({log.userRole === 'MINISTRY' ? 'משרד' : log.userRole === 'MUNICIPALITY' ? 'עירייה' : 'שמאי'})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{log.details}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(log.createdAt).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">📜</div>
            <p>אין היסטוריית פעולות עדיין</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function AssessmentForm({ buildingId, onSave }) {
  const [form, setForm] = useState({ damageLevel: 'MINOR', notes: '', inspectionDate: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } catch { } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit} className="mt-4 p-4 bg-slate-50 rounded-xl space-y-3 animate-slide-up">
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">רמת נזק</label>
        <select className="input" value={form.damageLevel} onChange={e => setForm(f => ({ ...f, damageLevel: e.target.value }))}>
          <option value="MINOR">קל</option>
          <option value="MODERATE">בינוני</option>
          <option value="SEVERE">חמור</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">תאריך בדיקה</label>
        <input type="date" className="input" value={form.inspectionDate} onChange={e => setForm(f => ({ ...f, inspectionDate: e.target.value }))} required />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">הערות</label>
        <textarea className="input h-20 resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="תיאור הנזק..." />
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
        {saving ? 'שומר...' : 'שמור הערכה'}
      </button>
    </form>
  );
}

function ApprovalForm({ buildingId, onSave }) {
  const [form, setForm] = useState({ waterOk: false, electricityOk: false, accessRoadsOk: false, hazardRemovalOk: false, notes: '' });
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } catch { } finally { setSaving(false); }
  }
  const toggle = k => setForm(f => ({ ...f, [k]: !f[k] }));
  return (
    <form onSubmit={submit} className="mt-4 p-4 bg-slate-50 rounded-xl space-y-3 animate-slide-up">
      {[
        { key: 'waterOk', label: 'מים תקינים', icon: '💧' },
        { key: 'electricityOk', label: 'חשמל תקין', icon: '⚡' },
        { key: 'accessRoadsOk', label: 'דרכי גישה פנויות', icon: '🛣️' },
        { key: 'hazardRemovalOk', label: 'פינוי מפגעים הושלם', icon: '⚠️' },
      ].map(({ key, label, icon }) => (
        <label key={key} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
          ${form[key] ? 'bg-emerald-100 border-2 border-emerald-300' : 'bg-white border-2 border-slate-200'}`}>
          <input type="checkbox" className="w-5 h-5 accent-emerald-600" checked={form[key]} onChange={() => toggle(key)} />
          <span className="text-xl">{icon}</span>
          <span className="font-medium text-slate-700 text-sm">{label}</span>
        </label>
      ))}
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">הערות</label>
        <textarea className="input h-16 resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="הערות נוספות..." />
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
        {saving ? 'שומר...' : 'שמור אישור תשתית'}
      </button>
    </form>
  );
}

function ConditionsForm({ building, onSave }) {
  const [form, setForm] = useState({
    hasDamageImages: !!building.hasDamageImages,
    hasEngineerReport: !!building.hasEngineerReport,
    hasEligibilityCheck: !!building.hasEligibilityCheck,
    apartmentsCount: building.apartmentsCount,
    hasSocialApproval: !!building.hasSocialApproval,
    hasBudgetRequest: !!building.hasBudgetRequest,
  });
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); } catch { } finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit} className="card space-y-3 animate-slide-up">
      <h3 className="font-semibold text-slate-700 text-sm">עדכון תנאי הזכאות</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'hasDamageImages', label: 'תמונות נזק', icon: '📸' },
          { key: 'hasEngineerReport', label: 'דוח הנדסי', icon: '🔧' },
          { key: 'hasEligibilityCheck', label: 'בדיקת זכאות', icon: '✔️' },
          { key: 'hasSocialApproval', label: 'אישור חברתי', icon: '👥' },
          { key: 'hasBudgetRequest', label: 'בקשת תקציב', icon: '💰' },
        ].map(({ key, label, icon }) => (
          <label key={key} className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer text-sm transition-all
            ${form[key] ? 'bg-emerald-100 border border-emerald-300' : 'bg-slate-100 border border-slate-200'}`}>
            <input type="checkbox" className="accent-emerald-600" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
            <span>{icon}</span><span className="font-medium">{label}</span>
          </label>
        ))}
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600 block mb-1">מספר דירות</label>
          <input type="number" min="0" className="input" value={form.apartmentsCount}
            onChange={e => setForm(f => ({ ...f, apartmentsCount: Number(e.target.value) }))} />
        </div>
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
        {saving ? 'שומר...' : 'שמור שינויים'}
      </button>
    </form>
  );
}
