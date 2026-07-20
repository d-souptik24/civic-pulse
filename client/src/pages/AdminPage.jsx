import { useCallback, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useNavigate } from 'react-router-dom';
import { triggerEscalation } from '../lib/api.js';
import { useAuth } from '../lib/AuthContext.jsx';
import {
  AlertCircle, CheckCircle, Clock, ExternalLink, Loader2,
  TrendingUp, Zap, BarChart3, Timer
} from 'lucide-react';
import { STATUS_CONFIG } from '../lib/constants.js';

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const ms = Date.now() - (timestamp?.toMillis?.() ?? new Date(timestamp).getTime());
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(ms) {
  const hours = ms / (1000 * 60 * 60);
  if (hours >= 24) return `${(hours / 24).toFixed(1)} days`;
  return `${hours.toFixed(1)} hours`;
}

// ── Stat Card Skeleton ─────────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div className="card-white p-5 animate-pulse">
      <div className="w-8 h-8 rounded-xl mb-3" style={{ backgroundColor: 'var(--color-stone-line)' }} />
      <div className="h-8 w-20 rounded-lg mb-2" style={{ backgroundColor: 'var(--color-stone-line)' }} />
      <div className="h-3 w-24 rounded" style={{ backgroundColor: 'var(--color-stone-paper)' }} />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [totalReports,    setTotalReports]    = useState(null);
  const [resolvedCount,   setResolvedCount]   = useState(null);
  const [metricsLoading,  setMetricsLoading]  = useState(true);

  const [issues, setIssues]             = useState([]);
  const [escalatedIssues, setEscalated] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);

  const [isEscalating, setIsEscalating]   = useState(false);
  const [escalateMsg,  setEscalateMsg]    = useState(null);
  const [escalateError, setEscalateError] = useState(null);

  // ── Fetch global aggregate counters ──────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const [totalSnap, resolvedSnap] = await Promise.all([
        getCountFromServer(collection(db, 'issues')),
        getCountFromServer(query(collection(db, 'issues'), where('status', '==', 'resolved'))),
      ]);
      setTotalReports(totalSnap.data().count);
      setResolvedCount(resolvedSnap.data().count);
    } catch (err) {
      console.error('Failed to fetch aggregate counts:', err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // ── Real-time listener for rolling window (last 100 issues) ──────────────────
  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('reportedAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setIssues(data);
      setEscalated(data.filter((i) => i.status === 'escalated'));
      setQueueLoading(false);
    });
    return unsub;
  }, []);

  // ── Derived Metrics ───────────────────────────────────────────────────────────
  const resolutionRate = metricsLoading || totalReports == null || resolvedCount == null
    ? null
    : totalReports === 0
      ? '0%'
      : `${Math.round((resolvedCount / totalReports) * 100)}%`;

  const resolvedWithTimestamps = issues.filter(
    (i) => i.status === 'resolved' && i.resolvedAt != null && i.reportedAt != null
  );
  const avgTimeToResolve = (() => {
    if (resolvedWithTimestamps.length === 0) return null;
    const totalMs = resolvedWithTimestamps.reduce((sum, i) => {
      return sum + (i.resolvedAt.toDate().getTime() - i.reportedAt.toDate().getTime());
    }, 0);
    return formatDuration(totalMs / resolvedWithTimestamps.length);
  })();

  // ── Run Escalation Agent ──────────────────────────────────────────────────────
  const handleRunEscalation = async () => {
    setIsEscalating(true);
    setEscalateMsg(null);
    setEscalateError(null);
    try {
      const token = await user.getIdToken();
      const result = await triggerEscalation(token);
      setEscalateMsg(
        result.escalatedCount > 0
          ? `✅ Escalated ${result.escalatedCount} issue${result.escalatedCount !== 1 ? 's' : ''} successfully.`
          : '✅ Agent ran — no new issues met escalation criteria.'
      );
      await fetchMetrics();
    } catch (err) {
      console.error('Escalation failed:', err);
      setEscalateError('⚠️ Escalation agent failed. Check server logs.');
    } finally {
      setIsEscalating(false);
    }
  };

  // ── Stat Cards Config ─────────────────────────────────────────────────────────
  const statCards = [
    { id: 'stat-total-reports',    label: 'Total Reports',     value: totalReports != null ? totalReports : null, icon: TrendingUp, accentColor: 'var(--color-plum)', iconBg: 'rgba(75, 46, 70, 0.08)' },
    { id: 'stat-resolution-rate',  label: 'Resolution Rate',   value: resolutionRate,                              icon: CheckCircle, accentColor: 'var(--color-plum)', iconBg: 'rgba(75, 46, 70, 0.08)' },
    { id: 'stat-escalated',        label: 'Escalated Issues',  value: escalatedIssues.length,                      icon: Zap,         accentColor: 'var(--color-plum)', iconBg: 'rgba(75, 46, 70, 0.08)' },
    { id: 'stat-avg-resolve',      label: 'Avg Time to Resolve', value: queueLoading ? null : (avgTimeToResolve ?? 'N/A'), icon: Timer, accentColor: 'var(--color-plum)',  iconBg: 'rgba(75, 46, 70, 0.08)' },
  ];

  if (user === undefined) {
    return (
      <div className="min-h-screen pt-24 flex justify-center items-center" style={{ backgroundColor: 'var(--color-stone-paper)' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-fog)' }} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-stone-paper)' }}>
        <div className="card-white p-12 text-center max-w-md w-full">
          <AlertCircle size={48} className="mx-auto mb-4" style={{ color: 'var(--color-signal-red)' }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>Access Denied</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-fog)' }}>
            You do not have the required administrative privileges to view this dashboard.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pt-20 pb-24 md:pb-10 px-4 max-w-6xl mx-auto animate-fade-in"
      style={{ backgroundColor: 'var(--color-stone-paper)' }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1
          className="font-bold flex items-center gap-2"
          style={{ fontSize: 'var(--text-heading)', lineHeight: 'var(--leading-heading)', color: 'var(--color-ink)' }}
        >
          <BarChart3 style={{ color: 'var(--color-plum)' }} size={28} />
          Admin Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-fog)' }}>
          Platform-wide analytics and agentic management tools
        </p>
      </div>

      {/* ── Stat Cards Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ id, label, value, icon: Icon, accentColor, iconBg }) =>
          metricsLoading && (label === 'Total Reports' || label === 'Resolution Rate') ? (
            <StatSkeleton key={id} />
          ) : (
            <div key={id} id={id} className="card-white p-4 sm:p-5 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: iconBg }}>
                <Icon size={15} style={{ color: accentColor }} />
              </div>
              <span className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-ink)', letterSpacing: '-0.48px' }}>
                {value ?? <Loader2 size={20} className="animate-spin" />}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-fog)' }}>
                {label}
              </span>
            </div>
          )
        )}
      </div>

      {/* ── Escalation Agent Trigger ── */}
      <div className="card-white p-4 sm:p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(75, 46, 70, 0.08)' }}>
            <Zap size={18} style={{ color: 'var(--color-plum)' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold mb-1" style={{ color: 'var(--color-ink)' }}>Escalation Agent</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-fog)' }}>
              Scans for open issues older than 24h with 3+ upvotes. Gemini drafts formal escalation summaries and updates their status to{' '}
              <span className="font-semibold" style={{ color: 'var(--color-plum)' }}>escalated</span>.
            </p>
            <button
              id="btn-run-escalation"
              onClick={handleRunEscalation}
              disabled={isEscalating}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isEscalating ? (
                <><Loader2 size={14} className="animate-spin" /> Running Agent…</>
              ) : (
                <><Zap size={14} /> Run Escalation Agent</>
              )}
            </button>

            {escalateMsg && (
              <p className="mt-3 text-sm px-4 py-2.5 rounded-xl animate-fade-in" style={{ color: 'var(--color-signal-green)', backgroundColor: 'rgba(62,122,84,0.08)', border: '1px solid rgba(62,122,84,0.2)' }}>
                {escalateMsg}
              </p>
            )}
            {escalateError && (
              <p className="mt-3 text-sm px-4 py-2.5 rounded-xl animate-fade-in" style={{ color: 'var(--color-signal-red)', backgroundColor: 'rgba(178,59,46,0.06)', border: '1px solid rgba(178,59,46,0.2)' }}>
                {escalateError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Escalation Queue ── */}
      <div className="space-y-4">
        <div className="px-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} style={{ color: 'var(--color-plum)' }} />
            <h2 className="font-bold text-lg" style={{ color: 'var(--color-ink)' }}>
              Escalation Queue
            </h2>
          </div>
          {escalatedIssues.length > 0 && (
            <span
              className={`text-[10px] px-2.5 py-0.5 font-semibold uppercase tracking-wider rounded-full border ${STATUS_CONFIG.escalated.border} ${STATUS_CONFIG.escalated.bg} ${STATUS_CONFIG.escalated.color}`}
            >
              {escalatedIssues.length} escalated
            </span>
          )}
        </div>

        {queueLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card-white p-3.5 sm:p-4 flex items-center gap-4 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded w-1/3" style={{ backgroundColor: 'var(--color-stone-line)' }} />
                  <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'var(--color-stone-paper)' }} />
                </div>
                <div className="w-24 h-8 rounded-lg" style={{ backgroundColor: 'var(--color-stone-line)' }} />
              </div>
            ))}
          </div>
        ) : escalatedIssues.length === 0 ? (
          <div className="card-white flex flex-col items-center justify-center py-12 gap-3" style={{ color: 'var(--color-fog)' }}>
            <CheckCircle size={36} />
            <p className="text-sm font-medium">No escalated issues</p>
            <p className="text-xs" style={{ color: 'var(--color-fog)' }}>All caught up! Run the agent to check for new issues.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {escalatedIssues.map((issue) => {
              const cfg = STATUS_CONFIG.escalated;
              return (
                <div
                  key={issue.id}
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  className="card-white p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-md cursor-pointer hover:border-[var(--color-plum-light)] hover:bg-[#F8F6F4] animate-fade-in"
                >
                  {/* Issue info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
                        {issue.title}
                      </p>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 font-semibold uppercase tracking-wider rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    {issue.aiEscalationSummary && (
                      <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--color-fog)' }}>
                        {issue.aiEscalationSummary}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-fog)' }}>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {timeAgo(issue.reportedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        👍 {issue.upvotes ?? 0} upvotes
                      </span>
                      <span className="capitalize">
                        📍 {issue.category?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    id={`btn-resolve-${issue.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/issues/${issue.id}`);
                    }}
                    className="btn-secondary shrink-0 flex items-center gap-1.5"
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                  >
                    <ExternalLink size={12} />
                    Resolve Issue
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
