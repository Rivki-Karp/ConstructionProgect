import React from 'react';

const STATUS_MAP = {
  WAITING_FOR_VALIDATION: { label: 'ממתין לאימות', cls: 'badge-waiting', icon: '⏳' },
  NEW: { label: 'חדש', cls: 'badge-new', icon: '🆕' },
  IN_REVIEW: { label: 'בבדיקה', cls: 'badge-review', icon: '🔍' },
  COMPLETED: { label: 'הושלם', cls: 'badge-completed', icon: '✅' },
};

const DAMAGE_MAP = {
  MINOR: { label: 'נזק קל', cls: 'badge-minor', icon: '🟢' },
  MODERATE: { label: 'נזק בינוני', cls: 'badge-moderate', icon: '🟡' },
  SEVERE: { label: 'נזק חמור', cls: 'badge-severe', icon: '🔴' },
};

export function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'badge-waiting', icon: '?' };
  return <span className={s.cls}>{s.icon} {s.label}</span>;
}

export function DamageBadge({ level }) {
  if (!level) return <span className="badge-waiting">— לא הוגש</span>;
  const d = DAMAGE_MAP[level] || { label: level, cls: 'badge-waiting', icon: '?' };
  return <span className={d.cls}>{d.icon} {d.label}</span>;
}
