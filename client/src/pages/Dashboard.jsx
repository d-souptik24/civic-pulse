import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useNavigate } from 'react-router-dom';
import Map from '../components/Map.jsx';
import { getInsights } from '../lib/api.js';
import { STATUS_COLOR_CLASS, STATUS_BG_CLASS } from '../lib/constants.js';
import { useAuth } from '../lib/AuthContext.jsx';
import {
  AlertCircle, BrainCircuit, CheckCircle, Clock,
  Loader2, TrendingUp, Zap, X
} from 'lucide-react';

// STATUS_COLORS and STATUS_BG removed — imported from lib/constants.js

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }; // Delhi

function FeedSkeleton() {
  return (
    <div className="animate-pulse px-4 py-3 border-b border-white/5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="h-3.5 bg-white/10 rounded w-3/5" />
        <div className="h-4 bg-white/10 rounded-full w-12 shrink-0" />
      </div>
      <div className="flex gap-3">
        <div className="h-3 bg-white/5 rounded w-16" />
        <div className="h-3 bg-white/5 rounded w-10" />
      </div>
    </div>
  );
}

function timeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const ms = Date.now() - (timestamp?.toMillis?.() ?? timestamp);
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [issues,        setIssues]        = useState([]);
  const [feedLoading,   setFeedLoading]   = useState(true);
  const [stats,         setStats]         = useState({ total: 0, open: 0, resolved: 0, escalated: 0 });
  const navigate              = useNavigate();

  // Pipeline 3 — Hotspot Insights state
  const [mapCenter,      setMapCenter]      = useState(DEFAULT_CENTER);
  const [insight,        setInsight]        = useState(null);   // { insight, issueCount, cached }
  const [insightLoading, setInsightLoading] = useState(false);
  const debounceRef = useRef(null);

  // Real-time Firestore listener for all issues
  useEffect(() => {
    const q = query(collection(db, 'issues'), orderBy('reportedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setIssues(data);
      setFeedLoading(false);
      setStats({
        total:     data.length,
        open:      data.filter((i) => i.status === 'open').length,
        resolved:  data.filter((i) => i.status === 'resolved').length,
        escalated: data.filter((i) => i.status === 'escalated').length,
      });
    });
    return unsub;
  }, []);

  // ── Pipeline 3: Auto-trigger insights on map center change ──────────────────
  // Dependencies are primitive floats (center.lat, center.lng) NOT the object
  // reference — prevents infinite re-render loops from Google Maps emitting
  // new object references on every tick.
  useEffect(() => {
    const lat = mapCenter.lat;
    const lng = mapCenter.lng;

    // Mount race condition guard — exit on uninitialized/default zero coords
    if (!lat || !lng || (lat === 0 && lng === 0) || !user) return;

    // isMounted guard — prevents state updates on unmounted components
    let isMounted = true;

    // Debounce: only fire once map has been stable for 1s
    debounceRef.current = setTimeout(async () => {
      if (!isMounted) return;
      setInsightLoading(true);
      try {
        const token = await user.getIdToken();
        const result = await getInsights(lat, lng, 5, token); // { lat, lng, radiusKm: 5 }
        if (isMounted) setInsight(result);
      } catch (err) {
        console.error('Insights fetch failed:', err);
      } finally {
        if (isMounted) setInsightLoading(false);
      }
    }, 1000);

    // Cleanup: clear timer AND flip isMounted on unmount/re-render
    return () => {
      clearTimeout(debounceRef.current);
      isMounted = false;
    };
  }, [mapCenter.lat, mapCenter.lng, user]); // primitives only + user object

  const handleMapCenterChange = useCallback((newCenter) => {
    setMapCenter(newCenter);
  }, []);

  const handleAnalyzeArea = () => {
    // Manual secondary trigger for demo purposes — force a re-trigger by
    // temporarily resetting then restoring center so the useEffect fires
    setInsight(null);
    setMapCenter((c) => ({ ...c })); // new reference, same values — triggers effect
  };

  const recentIssues = issues.slice(0, 8);

  const statCards = [
    { label: 'Total Reports', value: stats.total,     icon: TrendingUp,  color: 'text-[#00D4AA]',  bg: 'bg-[#00D4AA]/10' },
    { label: 'Open Issues',   value: stats.open,      icon: AlertCircle, color: 'text-red-400',    bg: 'bg-red-400/10'   },
    { label: 'Escalated',     value: stats.escalated, icon: Zap,         color: 'text-orange-400', bg: 'bg-orange-400/10'},
    { label: 'Resolved',      value: stats.resolved,  icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-400/10' },
  ];

  return (
    <div className="flex flex-col lg:flex-row pt-16 lg:pt-20 pb-20 lg:pb-4 px-4 gap-4 min-h-screen lg:h-screen animate-fade-in">
      {/* Left: Map (70%) */}
      <div className="w-full flex-none h-[55vh] lg:flex-[7] lg:h-auto min-w-0 relative">
        <Map
          issues={issues}
          onIssueClick={(issue) => navigate(`/issues/${issue.id}`)}
          onCenterChange={handleMapCenterChange}
        />

        {/* Pipeline 3 Controls — overlaid on the map */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">

          {/* Analyze Area Button */}
          {user ? (
            <button
              id="btn-analyze-area"
              onClick={handleAnalyzeArea}
              disabled={insightLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 glass-card rounded-xl text-xs font-semibold text-slate-300 hover:text-[#00D4AA] border border-white/10 hover:border-[#00D4AA]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {insightLoading
                ? <Loader2 size={12} className="animate-spin" />
                : <BrainCircuit size={12} />
              }
              Analyze Area
            </button>
          ) : (
            <div className="px-3 py-1.5 glass-card rounded-xl text-xs font-medium text-slate-400 border border-white/10">
              <span className="flex items-center gap-1.5">
                <BrainCircuit size={12} /> Login to analyze area
              </span>
            </div>
          )}
        </div>

        {/* AI Insights Overlay */}
        {(insight || insightLoading) && (
          <div className="absolute bottom-16 left-3 right-3 max-w-sm z-10">
            <div className="glass-card p-4 border border-[#00D4AA]/20">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={14} className="text-[#00D4AA] shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-[#00D4AA] uppercase tracking-wider">
                    AI Hotspot Insight
                  </p>
                </div>
                {insight && !insightLoading && (
                  <button
                    onClick={() => setInsight(null)}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {insightLoading ? (
                <div className="space-y-2">
                  <div className="h-3 bg-white/5 rounded animate-pulse w-full" />
                  <div className="h-3 bg-white/5 rounded animate-pulse w-4/5" />
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-300 leading-relaxed">{insight?.insight}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {insight?.issueCount} issue{insight?.issueCount !== 1 ? 's' : ''} in this area
                    {insight?.cached ? ' · cached' : ' · live'}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Stats + Feed (30%) */}
      <div className="w-full flex-none lg:flex-[3] min-w-0 flex flex-col gap-4 overflow-hidden animate-fade-in">
        {/* Stat cards grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card p-4 flex flex-col gap-2 hover:bg-white/10 transition-colors duration-200">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={15} className={color} />
              </div>
              <span className={`text-2xl font-extrabold tracking-tight ${color}`}>{value}</span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>

        {/* Recent reports feed */}
        <div className="glass-card flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-slate-100 tracking-wide">Recent Reports</h2>
            <button
              onClick={() => navigate('/issues')}
              className="text-xs text-[#00D4AA] hover:text-[#00b38f] transition-colors font-medium"
            >
              View all →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {feedLoading ? (
              // Skeleton feed while Firestore data loads — eliminates FOEC flash
              Array.from({ length: 4 }).map((_, i) => <FeedSkeleton key={i} />)
            ) : recentIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
                <Clock size={20} />
                No reports yet
              </div>
            ) : (
              recentIssues.map((issue) => (
                <button
                  key={issue.id}
                  id={`feed-issue-${issue.id}`}
                  onClick={() => navigate(`/issues/${issue.id}`)}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors duration-150 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-slate-200 font-medium leading-tight group-hover:text-[#00D4AA] transition-colors line-clamp-1">
                      {issue.title}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 capitalize ${STATUS_COLOR_CLASS[issue.status] ?? 'text-slate-400'} ${STATUS_BG_CLASS[issue.status] ?? 'bg-slate-400/10'}`}>
                      {issue.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">{timeAgo(issue.reportedAt)}</span>
                    <span className="text-xs text-slate-500">👍 {issue.upvotes ?? 0}</span>
                    {issue.severity === 'high' && (
                      <span className="text-xs text-red-400 font-medium">⚠️ High</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Report button */}
          <div className="p-3 border-t border-white/10">
            <button
              id="btn-report-issue"
              onClick={() => navigate('/report')}
              className="w-full py-2.5 rounded-xl bg-[#00D4AA] hover:bg-[#00BF97] text-slate-900 font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/50"
            >
              + Report an Issue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
