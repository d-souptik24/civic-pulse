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

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const ms = Date.now() - (timestamp?.toMillis?.() ?? new Date(timestamp).getTime());
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Convert ms → human-readable: "X hours" or "X days" */
function formatDuration(ms) {
  const hours = ms / (1000 * 60 * 60);
  if (hours >= 24) return `${(hours / 24).toFixed(1)} days`;
  return `${hours.toFixed(1)} hours`;
}

// ── Stat Card Skeleton ─────────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="w-8 h-8 rounded-xl bg-white/5 mb-3" />
      <div className="h-8 w-20 bg-white/5 rounded-lg mb-2" />
      <div className="h-3 w-24 bg-white/5 rounded" />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  // Global counters (from server aggregations)
  const [totalReports,    setTotalReports]    = useState(null); // null = loading
  const [resolvedCount,   setResolvedCount]   = useState(null);
  const [metricsLoading,  setMetricsLoading]  = useState(true);

  // Rolling 100-doc window for avg time
  const [issues, setIssues]             = useState([]);
  const [escalatedIssues, setEscalated] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);

  // Escalation Agent state
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

  // Resolution Rate: pure server-side — resolvedCount / totalReports
  const resolutionRate = metricsLoading || totalReports == null || resolvedCount == null
    ? null
    : totalReports === 0
      ? '0%'
      : `${Math.round((resolvedCount / totalReports) * 100)}%`;

  // Avg Time to Resolve: rolling 100-doc window
  // Explicit guard: only include issues where resolvedAt !== null
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
      // Re-fetch metrics since statuses may have changed
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
    {
      id: 'stat-total-reports',
      label: 'Total Reports',
      value: totalReports != null ? totalReports : null,
      icon: TrendingUp,
      color: 'text-[#00D4AA]',
      bg: 'bg-[#00D4AA]/10',
      suffix: '',
    },
    {
      id: 'stat-resolution-rate',
      label: 'Resolution Rate',
      value: resolutionRate,
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      suffix: '',
    },
    {
      id: 'stat-escalated',
      label: 'Escalated Issues',
      value: escalatedIssues.length,
      icon: Zap,
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
      suffix: '',
    },
    {
      id: 'stat-avg-resolve',
      label: 'Avg Time to Resolve',
      value: queueLoading ? null : (avgTimeToResolve ?? 'N/A'),
      icon: Timer,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      suffix: '',
    },
  ];

  // Show spinner while Firebase resolves the auth state (user === undefined = loading)
  if (user === undefined) {
    return (
      <div className="min-h-screen pt-24 flex justify-center items-center">
        <Loader2 size={32} className="animate-spin text-slate-500" />
      </div>
    );
  }

  // Block non-admins even if they navigate to /admin directly via URL
  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 flex items-center justify-center px-4">
        <div className="glass-card p-12 text-center max-w-md w-full">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-200 mb-2">Access Denied</h1>
          <p className="text-slate-400 text-sm mb-6">
            You do not have the required administrative privileges to view this dashboard.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00D4AA] hover:bg-[#00BF97] text-slate-900 text-sm font-bold transition-all hover:scale-105 active:scale-95"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-10 px-4 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <BarChart3 className="text-[#00D4AA]" size={24} />
          Admin Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Platform-wide analytics and agentic management tools
        </p>
      </div>

      {/* ── Stat Cards Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ id, label, value, icon: Icon, color, bg }) =>
          metricsLoading && (label === 'Total Reports' || label === 'Resolution Rate') ? (
            <StatSkeleton key={id} />
          ) : (
            <div key={id} id={id} className="glass-card p-5 flex flex-col gap-2">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={15} className={color} />
              </div>
              <span className={`text-2xl font-extrabold tracking-tight ${color}`}>
                {value ?? (
                  <Loader2 size={20} className="animate-spin" />
                )}
              </span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                {label}
              </span>
            </div>
          )
        )}
      </div>

      {/* ── Escalation Agent Trigger ── */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-100 mb-1">Escalation Agent</h2>
            <p className="text-sm text-slate-400 mb-4">
              Scans for open issues older than 24h with 3+ upvotes. Gemini drafts formal escalation summaries and updates their status to <span className="text-orange-400">escalated</span>.
            </p>
            <button
              id="btn-run-escalation"
              onClick={handleRunEscalation}
              disabled={isEscalating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-400/20 hover:bg-orange-400/30 border border-orange-400/30 text-orange-400 text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            >
              {isEscalating ? (
                <><Loader2 size={14} className="animate-spin" /> Running Agent…</>
              ) : (
                <><Zap size={14} /> Run Escalation Agent</>
              )}
            </button>

            {escalateMsg && (
              <p className="mt-3 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-2.5">
                {escalateMsg}
              </p>
            )}
            {escalateError && (
              <p className="mt-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
                {escalateError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Escalation Queue ── */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <AlertCircle size={16} className="text-orange-400" />
          <h2 className="font-semibold text-slate-100">
            Escalation Queue
          </h2>
          {escalatedIssues.length > 0 && (
            <span className="ml-auto text-xs bg-orange-400/20 text-orange-400 border border-orange-400/30 px-2.5 py-0.5 rounded-full font-semibold">
              {escalatedIssues.length} pending
            </span>
          )}
        </div>

        {queueLoading ? (
          // Fixed-height skeleton — queue is unbounded so row-count matching
          // would reintroduce the layout-jump bug fixed in the leaderboard.
          // A 200px pulse region matches the visual weight without the mismatch risk.
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-48 bg-white/5 rounded-xl" />
          </div>
        ) : escalatedIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
            <CheckCircle size={36} />
            <p className="text-sm font-medium text-slate-500">No escalated issues</p>
            <p className="text-xs text-slate-600">All caught up! Run the agent to check for new issues.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {escalatedIssues.map((issue) => (
              <div
                key={issue.id}
                className="px-6 py-4 flex items-start gap-4 hover:bg-white/5 transition-colors"
              >
                {/* Issue info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 line-clamp-1 mb-1">
                    {issue.title}
                  </p>
                  {issue.aiEscalationSummary && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                      {issue.aiEscalationSummary}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {timeAgo(issue.reportedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      👍 {issue.upvotes ?? 0} upvotes
                    </span>
                    <span className="capitalize text-slate-500">
                      {issue.category?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <button
                  id={`btn-resolve-${issue.id}`}
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00D4AA]/10 hover:bg-[#00D4AA]/20 border border-[#00D4AA]/30 text-[#00D4AA] text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                >
                  <ExternalLink size={12} />
                  Resolve Issue
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
