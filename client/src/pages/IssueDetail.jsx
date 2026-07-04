import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { verifyResolution, upvoteIssue, updateIssueStatus } from '../lib/api.js';
import { STATUS_CONFIG, VERDICT_COLORS } from '../lib/constants.js';
import {
  ArrowLeft, CheckCircle, Clock, AlertCircle, Zap,
  ChevronRight, Upload, ShieldCheck, ShieldX, ThumbsUp, Loader2, Shield
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────

// STATUS_CONFIG removed — imported from lib/constants.js



function timeAgo(timestamp) {
  if (!timestamp) return 'just now';
  const ms = Date.now() - (timestamp?.toMillis?.() ?? new Date(timestamp).getTime());
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = ts?.toDate?.() ?? new Date(ts);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Status Timeline Component ──────────────────────────────────────────────────
function StatusTimeline({ statusHistory }) {
  if (!statusHistory?.length) return null;

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Issue Timeline</h3>
      <div className="relative">
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-white/10" />
        <div className="space-y-5">
          {[...statusHistory].reverse().map((entry, idx) => {
            const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.open;
            return (
              <div key={idx} className="flex items-start gap-4 relative">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border} z-10`}>
                  <div className={`w-2 h-2 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
                </div>
                <div className="pt-0.5">
                  <p className={`text-sm font-semibold capitalize ${cfg.color}`}>
                    {entry.status?.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {entry.changedBy === 'ai_verifier' ? '🤖 AI Verifier' : (entry.changedBy || 'System')}
                    {entry.timestamp && ` · ${formatTimestamp(entry.timestamp)}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function IssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Admin resolution state
  const [resolutionFile, setResolutionFile]         = useState(null);
  const [resolutionPreview, setResolutionPreview]   = useState(null); // local blob URL
  const [uploadProgress, setUploadProgress]         = useState(0);
  const [isVerifying, setIsVerifying]               = useState(false);
  const [verdict, setVerdict]                       = useState(null); // { resolved, confidence, explanation }
  const [actionError, setActionError]               = useState(null);
  const [isMarkingProgress, setIsMarkingProgress]   = useState(false);
  const [isUpvoting, setIsUpvoting]                 = useState(false);

  const fileInputRef = useRef();
  const prevPreviewRef = useRef();

  // ── Real-time Firestore listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'issues', id), (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
      } else {
        setIssue({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  // ── Blob URL cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (prevPreviewRef.current) URL.revokeObjectURL(prevPreviewRef.current);
    };
  }, []);

  // ── Handle "After" photo selection (instant preview, no upload yet) ───────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (prevPreviewRef.current) URL.revokeObjectURL(prevPreviewRef.current); // prevent leak
    const blobUrl = URL.createObjectURL(file);
    prevPreviewRef.current = blobUrl;
    setResolutionFile(file);
    setResolutionPreview(blobUrl);
    setVerdict(null);
    setActionError(null);
  };

  // ── Upvote ────────────────────────────────────────────────────────────────────
  const handleUpvote = async () => {
    if (!user) {
      alert("Please sign in to upvote issues.");
      return;
    }
    if (isUpvoting) return;
    
    setIsUpvoting(true);
    try {
      const token = await user.getIdToken();
      await upvoteIssue(id, token);
    } catch (err) {
      console.error('Failed to upvote:', err);
    } finally {
      setIsUpvoting(false);
    }
  };

  // ── Mark as In Progress ───────────────────────────────────────────────────────
  const handleMarkInProgress = async () => {
    if (!issue || issue.status !== 'open') return;
    setIsMarkingProgress(true);
    setActionError(null);
    try {
      const token = await user.getIdToken();
      await updateIssueStatus(id, 'in_progress', token);
    } catch (err) {
      console.error(err);
      setActionError('Failed to update status. Please try again.');
    } finally {
      setIsMarkingProgress(false);
    }
  };

  // ── Verify Resolution ─────────────────────────────────────────────────────────
  const handleVerifyResolution = async () => {
    if (!resolutionFile || !issue) return;
    setIsVerifying(true);
    setActionError(null);
    setUploadProgress(0);

    try {
      // 1. Upload "After" photo to Firebase Storage (client-side, same pattern as Step1Photo)
      const storageRef = ref(storage, `resolutions/${id}_${Date.now()}_${resolutionFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, resolutionFile);

      const resolvedPhotoUrl = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          },
          (err) => reject(new Error('Upload failed: ' + err.message)),
          async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
        );
      });

      setUploadProgress(100);

      // 2. Call backend — it fetches both images, calls Gemini, updates Firestore
      const token = await user.getIdToken();
      const result = await verifyResolution(id, resolvedPhotoUrl, token);
      setVerdict(result);

      // Clean up local preview blob on success
      if (result.resolved) {
        if (prevPreviewRef.current) URL.revokeObjectURL(prevPreviewRef.current);
        setResolutionPreview(null);
        setResolutionFile(null);
      }
    } catch (err) {
      console.error('Verification failed:', err);
      setActionError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
      setUploadProgress(0);
    }
  };

  // ── Render states ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 max-w-5xl mx-auto px-4 animate-pulse">
        {/* Back breadcrumb skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-4 bg-white/10 rounded w-12" />
          <div className="h-4 bg-white/5 rounded w-20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left col skeleton */}
          <div className="lg:col-span-2 space-y-5">
            <div className="glass-card p-6 space-y-4">
              <div className="flex justify-between gap-4">
                <div className="h-6 bg-white/10 rounded w-3/4" />
                <div className="h-5 bg-white/5 rounded-full w-20 shrink-0" />
              </div>
              <div className="flex gap-4">
                <div className="h-3 bg-white/5 rounded w-20" />
                <div className="h-3 bg-white/5 rounded w-16" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-5/6" />
              </div>
            </div>
            <div className="glass-card p-5">
              <div className="h-56 bg-white/5 rounded-xl" />
            </div>
          </div>
          {/* Right col skeleton */}
          <div className="space-y-5">
            <div className="glass-card p-5 space-y-3">
              <div className="h-4 bg-white/10 rounded w-24" />
              <div className="h-9 bg-white/5 rounded-xl" />
              <div className="h-9 bg-white/5 rounded-xl" />
            </div>
            <div className="glass-card p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-3 h-3 rounded-full bg-white/10 shrink-0" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !issue) {
    return (
      <div className="min-h-[calc(100vh-4rem)] pt-24 flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-slate-200 mb-2">Issue Not Found</h1>
          <p className="text-slate-400 text-sm mb-6">This issue may have been removed or the link is invalid.</p>
          <button onClick={() => navigate('/')} className="btn-primary">← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open;
  // isAdmin comes from useAuth() — backed by Firebase Custom Claims, not spoofable
  const isResolved = issue.status === 'resolved';
  const canMarkInProgress = isAdmin && issue.status !== 'in_progress';
  // canMarkFixed is now accessible to ANY logged-in user
  const canMarkFixed = !!user;

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8 px-4 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <ChevronRight size={14} className="text-slate-600" />
        <span className="text-slate-400 text-sm capitalize">{issue.category?.replace('_', ' ')}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Issue details ────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title & Status */}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-xl font-bold text-slate-100 leading-tight">{issue.title}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 font-semibold capitalize ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
                {cfg.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-4">
              <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(issue.reportedAt)}</span>
              <button 
                onClick={handleUpvote}
                disabled={isUpvoting}
                className="flex items-center gap-1 hover:text-[#00D4AA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-500"
                title={user && issue.upvotedBy?.includes(user.uid) ? "Remove upvote" : "Upvote"}
              >
                {isUpvoting ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} className={user && issue.upvotedBy?.includes(user.uid) ? 'fill-current text-[#00D4AA]' : ''} />} 
                {issue.upvotes ?? 0} upvotes
              </button>
              {issue.severity && (
                <span className="flex items-center gap-1">
                  <AlertCircle size={12} />
                  Severity {issue.severity}/5
                </span>
              )}
              {issue.aiAuthenticity && (
                <span className="flex items-center gap-1 text-[#00D4AA]">
                  <ShieldCheck size={12} /> AI Verified
                </span>
              )}
            </div>

            {issue.description && (
              <p className="text-sm text-slate-300 leading-relaxed">{issue.description}</p>
            )}

            {issue.aiReasoning && (
              <div className="mt-4 p-3 bg-[#00D4AA]/5 border border-[#00D4AA]/20 rounded-xl">
                <p className="text-xs text-[#00D4AA] font-semibold mb-1">🤖 AI Analysis</p>
                <p className="text-xs text-slate-400">{issue.aiReasoning}</p>
              </div>
            )}

            {issue.aiEscalationSummary && (
              <div className="mt-3 p-3 bg-orange-400/5 border border-orange-400/20 rounded-xl">
                <p className="text-xs text-orange-400 font-semibold mb-1">⚡ Escalation Summary</p>
                <p className="text-xs text-slate-400">{issue.aiEscalationSummary}</p>
              </div>
            )}
          </div>

          {/* ── Photo Comparison ─────────────────────────────────────────────── */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              {resolutionPreview ? 'Before / After Comparison' : 'Issue Photo'}
            </h3>

            <div className={`grid gap-4 ${resolutionPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {/* Before */}
              <div>
                {resolutionPreview && (
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Before</p>
                )}
                {issue.photoUrl ? (
                  <img
                    src={issue.photoUrl}
                    alt="Original issue photo"
                    className="w-full rounded-xl object-cover aspect-video border border-white/10"
                  />
                ) : (
                  <div className="w-full aspect-video rounded-xl bg-slate-800 flex items-center justify-center text-slate-600 text-sm">
                    No photo
                  </div>
                )}
              </div>

              {/* After (preview) */}
              {resolutionPreview && (
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">After (Preview)</p>
                  <img
                    src={resolutionPreview}
                    alt="Resolution photo preview"
                    className="w-full rounded-xl object-cover aspect-video border border-[#00D4AA]/30"
                  />
                </div>
              )}

              {/* Resolved photo from Firestore */}
              {isResolved && issue.resolvedPhotoUrl && !resolutionPreview && (
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Resolved</p>
                  <img
                    src={issue.resolvedPhotoUrl}
                    alt="Resolution photo"
                    className="w-full rounded-xl object-cover aspect-video border border-green-400/30"
                  />
                </div>
              )}
            </div>

            {/* AI Resolution Explanation */}
            {issue.aiResolutionExplanation && (
              <div className={`mt-4 p-3 rounded-xl border ${issue.aiResolutionVerified ? `${VERDICT_COLORS.success.bg} ${VERDICT_COLORS.success.border}` : `${VERDICT_COLORS.failure.bg} ${VERDICT_COLORS.failure.border}`}`}>
                <p className={`text-xs font-semibold mb-1 ${issue.aiResolutionVerified ? VERDICT_COLORS.success.text : VERDICT_COLORS.failure.text}`}>
                  {issue.aiResolutionVerified ? '✅ AI: Resolution Confirmed' : '❌ AI: Resolution Rejected'}
                </p>
                <p className="text-xs text-slate-400">{issue.aiResolutionExplanation}</p>
              </div>
            )}
          </div>

          {/* ── Verdict Banner ───────────────────────────────────────────────── */}
          {verdict && (
            <div className={`glass-card p-5 border ${verdict.resolved ? `${VERDICT_COLORS.success.border} ${VERDICT_COLORS.success.bg}` : `${VERDICT_COLORS.failure.border} ${VERDICT_COLORS.failure.bg}`}`} style={{borderOpacity: 0.4}}>
              <div className="flex items-start gap-3">
                {verdict.resolved
                  ? <ShieldCheck size={22} className={`${VERDICT_COLORS.success.text} shrink-0 mt-0.5`} />
                  : <ShieldX size={22} className={`${VERDICT_COLORS.failure.text} shrink-0 mt-0.5`} />
                }
                <div>
                  <p className={`font-bold text-sm ${verdict.resolved ? VERDICT_COLORS.success.text : VERDICT_COLORS.failure.text}`}>
                    {verdict.resolved ? 'Resolution Confirmed by AI!' : 'AI Could Not Confirm Resolution'}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">{verdict.explanation}</p>
                  {verdict.confidence != null && (
                    <p className="text-xs text-slate-500 mt-1">Confidence: {Math.round(verdict.confidence * 100)}%</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Admin panel + Timeline ─────────────────────────────────── */}
        <div className="space-y-5">
          {/* Admin Actions Panel */}
          {isAdmin && !isResolved && canMarkInProgress && (
            <div className="glass-card p-5 border border-amber-500/20">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Shield size={16} className="text-amber-500" /> Admin Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleMarkInProgress}
                  disabled={isMarkingProgress}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-400 text-sm font-semibold hover:bg-amber-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMarkingProgress ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  Mark as In Progress
                </button>
              </div>
            </div>
          )}

          {/* Community Resolution Panel */}
          {canMarkFixed && !isResolved && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-brand" /> Help Resolve
              </h3>
              <div className="space-y-3">
                <p className="text-xs text-slate-400 mb-2">Upload a photo to let our AI Verifier close the ticket and award points.</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/20 bg-white/5 text-slate-300 text-sm font-semibold hover:bg-white/10 transition-all"
                >
                  <Upload size={14} />
                  {resolutionFile ? 'Change Resolution Photo' : 'Upload Resolution Photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {resolutionFile && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 truncate">📎 {resolutionFile.name}</p>

                    {/* Upload progress */}
                    {isVerifying && uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-[#00D4AA] h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}

                    <button
                      onClick={handleVerifyResolution}
                      disabled={isVerifying}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00D4AA] hover:bg-[#00BF97] text-slate-900 text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {uploadProgress < 100 ? `Uploading ${Math.round(uploadProgress)}%…` : 'AI Verifying…'}
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          Verify with AI
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Error */}
                {actionError && (
                  <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-2.5">
                    ⚠️ {actionError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Resolved badge */}
          {isResolved && (
            <div className="glass-card p-5 border border-green-400/30 bg-green-400/5 text-center">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-bold text-sm">Issue Resolved</p>
              {issue.resolvedAt && (
                <p className="text-xs text-slate-500 mt-1">{formatTimestamp(issue.resolvedAt)}</p>
              )}
            </div>
          )}

          {/* Status Timeline */}
          <StatusTimeline statusHistory={issue.statusHistory} />

          {/* Metadata card */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Details</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Category</span>
                <span className="text-slate-300 capitalize">{issue.category?.replace('_', ' ') || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Severity</span>
                <span className="text-slate-300">{issue.severity ?? '—'} / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reported</span>
                <span className="text-slate-300">{formatTimestamp(issue.reportedAt) || '—'}</span>
              </div>
              {issue.location && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordinates</span>
                  <span className="text-slate-300">
                    {issue.location.lat?.toFixed(4)}, {issue.location.lng?.toFixed(4)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">AI Authentic</span>
                <span className={issue.aiAuthenticity ? VERDICT_COLORS.success.text : VERDICT_COLORS.neutral.text}>
                  {issue.aiAuthenticity ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
