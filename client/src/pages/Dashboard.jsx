import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useNavigate } from 'react-router-dom';
import { Map } from '../components/Map.jsx';
import { getInsights } from '../lib/api.js';
import { STATUS_CONFIG } from '../lib/constants.js';
import { useAuth } from '../lib/AuthContext.jsx';
import {
  AlertCircle, BrainCircuit, CheckCircle, Clock,
  Loader2, TrendingUp, Zap, X, UserPlus, Sparkles
} from 'lucide-react';

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }; // Delhi

// ── Feed Skeleton ────────────────────────────────────────────────────────────
function FeedSkeleton() {
  return (
    <div className="animate-pulse px-4 py-3" style={{ borderBottom: '1px solid var(--color-stone-line)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="h-3.5 rounded w-3/5" style={{ backgroundColor: 'var(--color-stone-line)' }} />
        <div className="h-4 w-12 shrink-0" style={{ backgroundColor: 'var(--color-stone-line)', borderRadius: 'var(--radius-badge)' }} />
      </div>
      <div className="flex gap-3">
        <div className="h-3 rounded w-16" style={{ backgroundColor: 'var(--color-stone-paper)' }} />
        <div className="h-3 rounded w-10" style={{ backgroundColor: 'var(--color-stone-paper)' }} />
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

// ── Guest Nudge Card ─────────────────────────────────────────────────────────
function GuestNudgeCard({ onDismiss, onSignIn }) {
  return (
    <div
      className="m-4 mb-2 p-4 flex flex-col gap-4 relative overflow-hidden animate-fade-in-up"
      style={{
        backgroundColor: 'var(--color-stone-paper)',
        border: '1px solid var(--color-stone-line)',
        borderRadius: 'var(--radius-card)',
        borderLeft: '3px solid var(--color-plum)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 items-start">
          <div
            className="p-2 rounded-lg shrink-0"
            style={{
              backgroundColor: 'rgba(75,46,70,0.08)',
              border: '1px solid rgba(75,46,70,0.15)',
              color: 'var(--color-plum)',
            }}
          >
            <UserPlus size={16} aria-hidden="true" />
          </div>
          <div>
            <h3
              className="font-semibold text-sm"
              style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}
            >
              Join your neighborhood
            </h3>
            <p
              className="text-xs mt-1 leading-relaxed"
              style={{ color: 'var(--color-fog)', fontFamily: 'var(--font-body)' }}
            >
              Sign in to upvote issues, track resolutions, and report local hazards on the map.
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss this suggestion for now"
          className="p-1.5 -mr-1.5 -mt-1.5 rounded transition-colors focus-visible:outline-none shrink-0"
          style={{ color: 'var(--color-fog)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-ink)'; e.currentTarget.style.backgroundColor = 'var(--color-stone-line)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-fog)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-1">
        <button
          onClick={onSignIn}
          className="btn-primary w-full"
          style={{ fontSize: '13px', padding: '10px 16px' }}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

// Feed status badge styles — Signal colors, semantically locked
const FEED_STATUS = {
  pending:     { color: 'var(--color-fog)',          bg: 'var(--color-stone-paper)',                 label: 'Pending' },
  unverified:  { color: 'var(--color-fog)',          bg: 'var(--color-stone-paper)',                 label: 'Unverified' },
  open:        { color: 'var(--color-signal-red)',   bg: 'rgba(178,59,46,0.08)',                     label: 'Open' },
  in_progress: { color: 'var(--color-signal-amber)', bg: 'rgba(198,125,45,0.1)',                    label: 'In Progress' },
  escalated:   { color: 'var(--color-plum)',          bg: 'rgba(75,46,70,0.08)',                     label: 'Escalated' },
  resolved:    { color: 'var(--color-signal-green)', bg: 'rgba(62,122,84,0.1)',                     label: 'Resolved' },
};

export default function Dashboard() {
  const { user, signInWithGoogle } = useAuth();
  const [issues,        setIssues]        = useState([]);
  const [feedLoading,   setFeedLoading]   = useState(true);
  const [stats,         setStats]         = useState({ total: 0, open: 0, resolved: 0, escalated: 0 });
  const [isNudgeDismissed, setIsNudgeDismissed] = useState(() => sessionStorage.getItem('guest_nudge_dismissed') === 'true');
  const navigate = useNavigate();

  // Pipeline 3 — Hotspot Insights state
  const [mapCenter,      setMapCenter]      = useState(DEFAULT_CENTER);
  const [insight,        setInsight]        = useState(null);
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

  // Pipeline 3: Auto-trigger insights on map center change
  useEffect(() => {
    const lat = mapCenter.lat;
    const lng = mapCenter.lng;
    if (!lat || !lng || (lat === 0 && lng === 0) || !user) return;

    let isMounted = true;
    debounceRef.current = setTimeout(async () => {
      if (!isMounted) return;
      setInsightLoading(true);
      try {
        const token = await user.getIdToken();
        const result = await getInsights(lat, lng, 5, token);
        if (isMounted) setInsight(result);
      } catch (err) {
        console.error('Insights fetch failed:', err);
      } finally {
        if (isMounted) setInsightLoading(false);
      }
    }, 1000);

    return () => {
      clearTimeout(debounceRef.current);
      isMounted = false;
    };
  }, [mapCenter.lat, mapCenter.lng, user]);

  const handleMapCenterChange = useCallback((newCenter) => {
    setMapCenter(newCenter);
  }, []);

  const handleAnalyzeArea = () => {
    setInsight(null);
    setMapCenter((c) => ({ ...c }));
  };

  const recentIssues = issues.slice(0, 8);

  const statCards = [
    { label: 'Total',     value: stats.total,     icon: TrendingUp,  accentColor: 'var(--color-fog)',          iconBg: 'var(--color-stone-paper)' },
    { label: 'Open',      value: stats.open,      icon: AlertCircle, accentColor: 'var(--color-signal-red)',   iconBg: 'rgba(178,59,46,0.1)' },
    { label: 'Escalated', value: stats.escalated, icon: Zap,         accentColor: 'var(--color-plum)',          iconBg: 'rgba(75,46,70,0.08)' },
    { label: 'Resolved',  value: stats.resolved,  icon: CheckCircle, accentColor: 'var(--color-signal-green)', iconBg: 'rgba(62,122,84,0.1)' },
  ];

  return (
    <div
      className="flex flex-col xl:flex-row pt-16 xl:pt-20 pb-20 xl:pb-4 px-4 gap-4 min-h-screen xl:h-screen animate-fade-in"
      style={{ backgroundColor: 'var(--color-stone-paper)' }}
    >
      {/* Left: Map (70%) — styled as a framed card with thin padding and shadow */}
      <div 
        className="w-full flex-none h-[55vh] xl:flex-[7] xl:h-auto min-w-0 relative rounded-2xl border shadow-report-card p-2 flex flex-col"
        style={{ 
          borderColor: 'var(--color-stone-line)',
          backgroundColor: 'var(--color-stone-white)'
        }}
      >
        <div className="relative flex-1 w-full h-full min-h-0">
          <Map
            issues={issues}
            onIssueClick={(issue) => navigate(`/issues/${issue.id}`)}
            onCenterChange={handleMapCenterChange}
          />
        </div>

        {/* Pipeline 3 Controls — overlaid on the map */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {user ? (
            <button
              id="btn-analyze-area"
              onClick={handleAnalyzeArea}
              disabled={insightLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--color-stone-white)',
                border: '1px solid var(--color-stone-line)',
                color: 'var(--color-plum)',
                borderRadius: 'var(--radius-control)',
                boxShadow: 'var(--shadow-card)',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-plum)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-stone-line)'; }}
            >
              {insightLoading
                ? <Loader2 size={12} className="animate-spin" />
                : <BrainCircuit size={12} />
              }
              Analyze Area
            </button>
          ) : (
            <div
              className="px-3 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: 'var(--color-stone-white)',
                border: '1px solid var(--color-stone-line)',
                color: 'var(--color-fog)',
                borderRadius: 'var(--radius-control)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <span className="flex items-center gap-1.5">
                <BrainCircuit size={12} />Login to analyze area
              </span>
            </div>
          )}
        </div>

        {/* AI Insights Overlay */}
        {(insight || insightLoading) && (
          <div className="absolute bottom-16 left-3 right-3 max-w-sm z-10">
            <div
              style={{
                backgroundColor: 'var(--color-stone-white)',
                border: '1px solid var(--color-stone-line)',
                borderRadius: 'var(--radius-card)',
                boxShadow: 'var(--shadow-report-card)',
                padding: '16px',
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--color-plum)' }} />
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-plum)', fontFamily: 'var(--font-body)' }}>
                    AI Hotspot Insight
                  </p>
                </div>
                {insight && !insightLoading && (
                  <button onClick={() => setInsight(null)} style={{ color: 'var(--color-fog)' }}>
                    <X size={12} />
                  </button>
                )}
              </div>
              {insightLoading ? (
                <div className="space-y-2">
                  <div className="h-3 rounded animate-pulse w-full" style={{ backgroundColor: 'var(--color-stone-line)' }} />
                  <div className="h-3 rounded animate-pulse w-4/5" style={{ backgroundColor: 'var(--color-stone-line)' }} />
                </div>
              ) : (
                <>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}>{insight?.insight}</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-fog)', fontFamily: 'var(--font-mono)' }}>
                    {insight?.issueCount} issue{insight?.issueCount !== 1 ? 's' : ''} in this area
                    {insight?.cached ? ' · cached' : ' · live'}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Stats + Feed (30%) — light parchment sidebar */}
      <div
        className="w-full flex-none xl:flex-[3] min-w-0 flex flex-col gap-4 overflow-hidden animate-fade-in"
        style={{
          backgroundColor: 'var(--color-stone-paper)',
          borderRadius: 'var(--radius-card)',
        }}
      >
        {/* Stat cards grid — Stat Card spec: Stone White, shadow-card, icon in Signal color circle */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(({ label, value, icon: Icon, accentColor, iconBg }) => (
            <div
              key={label}
              className="stat-card flex flex-col gap-2"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconBg }}>
                <Icon size={15} style={{ color: accentColor }} />
              </div>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  color: 'var(--color-ink)',
                  fontFamily: 'var(--font-body)',
                }}
              >{value}</span>
              <span
                className="text-caption-label"
                style={{ color: 'var(--color-fog)', fontSize: '11px' }}
              >{label}</span>
            </div>
          ))}
        </div>

        {/* Recent reports feed */}
        <div className="card-white flex flex-col flex-1 overflow-hidden">
          <div
            className="px-4 py-3.5 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--color-stone-line)' }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '14px',
                color: 'var(--color-ink)',
              }}
            >Recent Reports</h2>
            <button
              onClick={() => navigate('/issues')}
              className="text-xs font-medium transition-opacity"
              style={{ color: 'var(--color-plum)', fontFamily: 'var(--font-body)' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              View all →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pb-2" style={{ borderColor: 'var(--color-dew)' }}>

            {/* Guest Nudge CTA for unauthenticated users */}
            {user === null && !isNudgeDismissed && (
              <GuestNudgeCard
                onDismiss={() => {
                  sessionStorage.setItem('guest_nudge_dismissed', 'true');
                  setIsNudgeDismissed(true);
                }}
                onSignIn={signInWithGoogle}
              />
            )}

            {feedLoading ? (
              Array.from({ length: 4 }).map((_, i) => <FeedSkeleton key={i} />)
            ) : recentIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-sm gap-2" style={{ color: 'var(--color-mist)' }}>
                <Clock size={20} />
                No reports yet
              </div>
            ) : (
              recentIssues.map((issue) => {
                const statusCfg = FEED_STATUS[issue.status] ?? FEED_STATUS.open;
                return (
                  <button
                    key={issue.id}
                    id={`feed-issue-${issue.id}`}
                    onClick={() => navigate(`/issues/${issue.id}`)}
                    className="w-full text-left px-4 py-3 transition-colors duration-150"
                    style={{ borderBottom: '1px solid var(--color-stone-line)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-stone-paper)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-sm font-medium leading-tight line-clamp-1"
                        style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}
                      >
                        {issue.title}
                      </p>
                      <span
                        className="text-xs shrink-0 capitalize font-semibold"
                        style={{
                          color: statusCfg.color,
                          backgroundColor: statusCfg.bg,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-badge)',
                          fontSize: '10px',
                          letterSpacing: '0.03em',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className="text-xs"
                        style={{ color: 'var(--color-fog)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                      >{timeAgo(issue.reportedAt)}</span>
                      <span className="text-xs" style={{ color: 'var(--color-fog)' }}>👍 {issue.upvotes ?? 0}</span>
                      {issue.severity === 'high' && (
                        <span className="text-xs font-medium" style={{ color: 'var(--color-signal-red)' }}>⚠️ High</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Report button */}
          <div className="p-3" style={{ borderTop: '1px solid var(--color-stone-line)' }}>
            <button
              id="btn-report-issue"
              onClick={() => navigate('/report')}
              className="btn-primary w-full"
              style={{ fontSize: '14px', padding: '10px 16px' }}
            >
              + Report an Issue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
