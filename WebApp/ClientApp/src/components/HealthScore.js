import React, { useMemo } from 'react';
import './HealthScore.css';

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function HealthScore({ statistics }) {
  const { score, label, color } = useMemo(() => {
    if (!statistics?.by_severity) return { score: 100, label: 'Excellent', color: 'var(--health-excellent)' };
    const s = statistics.by_severity;
    const total = (s.critical || 0) + (s.error || 0) + (s.warning || 0) + (s.information || 0);
    if (total === 0) return { score: 100, label: 'Excellent', color: 'var(--health-excellent)' };

    const penalty = (s.critical || 0) * 40 + (s.error || 0) * 25 + (s.warning || 0) * 10;
    const raw = 100 - (penalty / Math.max(total, 1));
    const score = clamp(Math.round(raw), 0, 100);

    if (score >= 90) return { score, label: 'Excellent', color: 'var(--health-excellent)' };
    if (score >= 75) return { score, label: 'Good', color: 'var(--health-good)' };
    if (score >= 60) return { score, label: 'Fair', color: 'var(--health-fair)' };
    return { score, label: 'Poor', color: 'var(--health-poor)' };
  }, [statistics]);

  const gradient = `conic-gradient(${color} ${score * 3.6}deg, #e2e8f0 0deg)`;

  return (
    <div className="health-card">
      <div className="health-gauge" style={{ background: gradient }}>
        <div className="health-gauge-inner">
          <div className="health-score">{score}</div>
          <div className="health-label">{label}</div>
        </div>
      </div>
      <div className="health-meta">
        <div className="health-title">Experience Health</div>
        <div className="health-sub">Aggregated across severities</div>
      </div>
    </div>
  );
}

export default HealthScore;
