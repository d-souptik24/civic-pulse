import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { STATUS_CONFIG } from '../lib/constants.js';
import { AlertCircle, CheckCircle, Clock, Filter, ThumbsUp } from 'lucide-react';

// ── Status + Category Configuration ───────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending',      value: 'pending' },
  { label: 'Unverified',   value: 'unverified' },
  { label: 'Open',         value: 'open' },
  { label: 'In Progress',  value: 'in_progress' },
  { label: 'Escalated',    value: 'escalated' },
  { label: 'Resolved',     value: 'resolved' },
];

const CATEGORY_OPTIONS = [
  { label: 'All Categories', value: 'all' },
  { label: 'Pothole',        value: 'pothole' },
  { label: 'Water Leak',     value: 'water_leak' },
  { label: 'Streetlight',    value: 'streetlight' },
  { label: 'Waste',          value: 'waste' },
  { label: 'Road Damage',    value: 'road_damage' },
  { label: 'Sewage',         value: 'sewage' },
  { label: 'Other',          value: 'other' },
];

// STATUS_CONFIG removed — imported from lib/constants.js

const CATEGORY_EMOJI = {
  pothole:      '🕳️',
  streetlight:  '💡',
  water_leak:   '💧',
  waste:        '🗑️',
  road_damage:  '🚧',
  sewage:       '🚨',
  encroachment: '🏗️',
  other:        '📍',
};

function timeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const ms = Date.now() - (timestamp?.toMillis?.() ?? new Date(timestamp).getTime());
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Issue Card ─────────────────────────────────────────────────────────────────
function IssueCard({ issue, onClick }) {
  const cfg = STATUS_CONFIG[issue.status] ?? STATUS_CONFIG.open;
  const emoji = CATEGORY_EMOJI[issue.category] ?? '📍';

  return (
    <button
      id={`issue-card-${issue.id}`}
      onClick={onClick}
      className="glass-card p-4 text-left w-full group hover:bg-white/10 transition-all duration-200 hover:scale-[1.01] hover:border-white/20 animate-fade-in"
    >
      {/* Photo + Status Row */}
      <div className="flex items-start gap-3 mb-3">
        {issue.photoUrl ? (
          <img
            src={issue.photoUrl}
            alt={issue.title}
            className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-slate-700/60 border border-white/10 flex items-center justify-center text-2xl shrink-0">
            {emoji}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-100 leading-tight group-hover:text-[#00D4AA] transition-colors line-clamp-2">
              {issue.title}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium capitalize ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          {issue.description && (
            <p className="text-xs text-slate-500 line-clamp-1">{issue.description}</p>
          )}
        </div>
      </div>

      {/* Meta Row */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {timeAgo(issue.reportedAt)}
        </span>
        <span className="flex items-center gap-1">
          <ThumbsUp size={10} />
          {issue.upvotes ?? 0}
        </span>
        {issue.aiAuthenticity && (
          <span className="text-[#00D4AA] flex items-center gap-1">
            <CheckCircle size={10} />
            AI Verified
          </span>
        )}
        {issue.severity && (
          <span className="capitalize">
            {emoji} {issue.category?.replace('_', ' ')}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function IssuesList() {
  const [issues, setIssues]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter]       = useState('all');
  const [searchParams] = useSearchParams();
  const reporterFilter = searchParams.get('reporter');
  const targetName = searchParams.get('name');
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Real-time Firestore listener — .limit(100) defensive query boundary
  useEffect(() => {
    setLoading(true);
    let q;
    
    // Security check: Only admins can view OTHER people's specific feeds
    if (reporterFilter && reporterFilter !== 'me' && reporterFilter !== user?.uid && !isAdmin) {
      navigate('/issues');
      return;
    }

    if (reporterFilter && reporterFilter !== 'me' && user) {
      q = query(
        collection(db, 'issues'),
        where('reportedBy', '==', reporterFilter)
      );
    } else if (reporterFilter === 'me' && user) {
      q = query(
        collection(db, 'issues'),
        where('reportedBy', '==', user.uid)
      );
    } else {
      q = query(
        collection(db, 'issues'),
        orderBy('reportedAt', 'desc'),
        limit(100)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (reporterFilter === 'me') {
        docs.sort((a, b) => {
          const tA = a.reportedAt?.toMillis?.() || 0;
          const tB = b.reportedAt?.toMillis?.() || 0;
          return tB - tA;
        });
      }
      setIssues(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Client-side filter (from the in-memory 100-doc slice)
  const filtered = issues.filter((issue) => {
    const statusOk   = statusFilter === 'all' || issue.status === statusFilter;
    const categoryOk = catFilter === 'all'    || issue.category === catFilter;
    return statusOk && categoryOk;
  });

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-10 px-4 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            {reporterFilter === 'me' 
              ? 'My Reported Issues' 
              : reporterFilter 
                ? `${targetName || 'Citizen'}'s Reported Issues` 
                : 'Issues Directory'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {reporterFilter === 'me' 
              ? 'All civic issues you have reported' 
              : reporterFilter 
                ? 'Admin Audit View — Viewing all issues reported by this citizen'
                : 'Browse and filter up to the 100 most recent civic reports'}
          </p>
        </div>
        {reporterFilter && (
          <button 
            onClick={() => navigate('/issues')}
            className="ml-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300 rounded-xl transition-colors"
          >
            View All
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6 flex flex-wrap gap-4 items-center">
        <Filter size={16} className="text-slate-400 shrink-0" />

        {/* Status Filter */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">
            Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-800 border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#00D4AA]/50 transition-colors"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">
            Category
          </label>
          <select
            id="filter-category"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="w-full bg-slate-800 border border-white/10 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#00D4AA]/50 transition-colors"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Result Count Badge */}
        <div className="ml-auto">
          <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full border border-white/10">
            {loading ? '—' : `${filtered.length} issue${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Loading State — 6 skeleton cards matching IssueCard shape */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-16 h-16 rounded-xl bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between gap-2">
                    <div className="h-3.5 bg-white/10 rounded w-3/5" />
                    <div className="h-4 bg-white/5 rounded-full w-14 shrink-0" />
                  </div>
                  <div className="h-3 bg-white/5 rounded w-4/5" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-3 bg-white/5 rounded w-16" />
                <div className="h-3 bg-white/5 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="glass-card p-12 text-center">
          <AlertCircle size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No issues match your filters</p>
          <p className="text-slate-600 text-sm mt-1">Try adjusting the status or category filter above.</p>
        </div>
      )}

      {/* Issues Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onClick={() => navigate(`/issues/${issue.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
