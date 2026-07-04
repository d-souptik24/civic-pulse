import { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Trophy, Star, Shield, Zap, Droplets, MapPin, ThumbsUp, Award } from 'lucide-react';

// ── Badge Configuration ───────────────────────────────────────────────────────
const BADGE_CONFIG = {
  'Pothole Patrol':    { icon: MapPin,    color: 'text-amber-400',   bg: 'bg-amber-400/10',  border: 'border-amber-400/30',  desc: 'Reported a pothole' },
  'Water Warden':      { icon: Droplets,  color: 'text-blue-400',    bg: 'bg-blue-400/10',   border: 'border-blue-400/30',   desc: 'Reported a water leak' },
  'Light Keeper':      { icon: Zap,       color: 'text-yellow-400',  bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', desc: 'Reported a streetlight issue' },
  'Upvote Champion':   { icon: ThumbsUp,  color: 'text-purple-400',  bg: 'bg-purple-400/10', border: 'border-purple-400/30', desc: 'Gave 20 upvotes to the community' },
  'Community Savior':  { icon: Shield,    color: 'text-brand',       bg: 'bg-brand/10',      border: 'border-brand/30',      desc: 'Had an issue verified as resolved by AI' },
};

// ── Rank Medal Display ────────────────────────────────────────────────────────
function RankMedal({ rank }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="text-slate-400 font-bold text-lg w-8 text-center">#{rank}</span>;
}

// ── Badge Chip ────────────────────────────────────────────────────────────────
function BadgeChip({ name }) {
  const config = BADGE_CONFIG[name];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color} ${config.bg} ${config.border}`}
      title={config.desc}
    >
      <Icon size={10} />
      {name}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, onClick }) {
  return (
    <div onClick={onClick} className={`glass-card p-4 flex flex-col items-center gap-1 text-center ${onClick ? 'cursor-pointer hover:bg-white/10 hover:scale-105 transition-all' : ''}`}>
      <Icon size={20} className={color} />
      <p className="text-2xl font-bold text-slate-100">{value ?? 0}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const confettiFired = useRef(false);

  // ── Real-time Top 10 Listener ─────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      orderBy('points', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        rank: index + 1,
        ...doc.data(),
      }));
      setTopUsers(users);
      setLoading(false);
    }, (error) => {
      console.error('Leaderboard listener error:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── Real-time Current User Profile Listener ───────────────────────────────
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setMyProfile(snap.data());
      }
    });

    return unsubscribe;
  }, [user]);

  // ── Compute My Rank from Top 10 ───────────────────────────────────────────
  useEffect(() => {
    if (!user || topUsers.length === 0) return;
    const found = topUsers.find(u => u.id === user.uid);
    setMyRank(found ? found.rank : '10+');
  }, [user, topUsers]);

  // ── Confetti Trigger (60-second event-proximate window) ───────────────────
  useEffect(() => {
    if (!myProfile || confettiFired.current) return;

    // Handle case where lastBadgeAwardedAt is null/absent (schema extension safety)
    const lastBadgeTs = myProfile.lastBadgeAwardedAt;
    if (!lastBadgeTs) return;

    // Convert Firestore Timestamp to milliseconds
    const lastBadgeMs = lastBadgeTs.toMillis ? lastBadgeTs.toMillis() : lastBadgeTs * 1000;
    const nowMs = Date.now();
    const sixtySeconds = 60 * 1000;

    if (nowMs - lastBadgeMs < sixtySeconds) {
      confettiFired.current = true;
      // Burst from both sides for maximum drama
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { x: 0.3, y: 0.6 },
        colors: ['#00D4AA', '#00BF97', '#FFD700', '#A78BFA'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { x: 0.7, y: 0.6 },
          colors: ['#00D4AA', '#00BF97', '#FFD700', '#A78BFA'],
        });
      }, 200);
    }
  }, [myProfile]);

  return (
    <div className="min-h-screen bg-slate-900 pt-20 pb-24 md:pb-12 px-4 animate-fade-in">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-sm font-medium mb-4">
            <Trophy size={14} />
            Community Leaderboard
          </div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Top Citizens</h1>
          <p className="text-slate-400">Earn points by reporting, upvoting, and resolving issues in your community.</p>
        </div>

        {/* ── My Stats (only shown when logged in) ─────────────────────────── */}
        {user && myProfile && (
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-12 h-12 rounded-full ring-2 ring-brand/50"
              />
              <div>
                <p className="font-semibold text-slate-100">{user.displayName}</p>
                <p className="text-sm text-slate-400">Your stats</p>
              </div>
              <div className="ml-auto flex items-center gap-2 glass-card px-3 py-1.5">
                <Star size={14} className="text-brand" />
                <span className="font-bold text-brand">Rank #{myRank}</span>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Points" value={myProfile.points} icon={Star} color="text-brand" />
              <StatCard 
                label="Reports" 
                value={myProfile.reportsCount} 
                icon={MapPin} 
                color="text-amber-400" 
                onClick={() => navigate('/issues?reporter=me')}
              />
              <StatCard label="Resolved" value={myProfile.issuesResolved} icon={Shield} color="text-green-400" />
            </div>

            {/* Badges */}
            {myProfile.badges && myProfile.badges.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Your Badges</p>
                <div className="flex flex-wrap gap-2">
                  {myProfile.badges.map(badge => (
                    <BadgeChip key={badge} name={badge} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Top 10 List ───────────────────────────────────────────────────── */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
            <Award size={16} className="text-brand" />
            <h2 className="font-semibold text-slate-200">Top 10 Citizens</h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-6 bg-white/10 rounded" />
                  <div className="w-10 h-10 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/10 rounded w-32" />
                    <div className="h-2 bg-white/10 rounded w-20" />
                  </div>
                  <div className="h-4 bg-white/10 rounded w-16" />
                </div>
              ))}
            </div>
          ) : topUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p>No citizens on the board yet. Be the first!</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {topUsers.map((citizen) => {
                const isMe = user && citizen.id === user.uid;
                return (
                  <li
                    key={citizen.id}
                    onClick={() => {
                      if (isAdmin) navigate(`/issues?reporter=${citizen.id}&name=${encodeURIComponent(citizen.displayName || 'Citizen')}`);
                    }}
                    className={`group flex items-center gap-4 px-6 py-4 transition-colors duration-200 ${
                      isMe ? 'bg-brand/5 border-l-2 border-brand' : 'hover:bg-white/3'
                    } ${isAdmin ? 'cursor-pointer hover:bg-white/10' : ''}`}
                  >
                    {/* Rank */}
                    <div className="w-8 flex justify-center shrink-0">
                      <RankMedal rank={citizen.rank} />
                    </div>

                    {/* Avatar */}
                    {citizen.photoURL ? (
                      <img
                        src={citizen.photoURL}
                        alt={citizen.displayName}
                        className="w-10 h-10 rounded-full ring-1 ring-white/20 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                        <span className="text-slate-300 font-semibold text-sm">
                          {citizen.displayName?.[0] ?? '?'}
                        </span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium truncate ${isMe ? 'text-brand' : 'text-slate-200'}`}>
                          {citizen.displayName ?? 'Anonymous'}
                          {isMe && <span className="text-xs text-brand ml-1">(You)</span>}
                        </p>
                      </div>
                      {/* Badges */}
                      {citizen.badges && citizen.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {citizen.badges.slice(0, 3).map(badge => (
                            <BadgeChip key={badge} name={badge} />
                          ))}
                          {citizen.badges.length > 3 && (
                            <span className="text-xs text-slate-500">+{citizen.badges.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Points */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-brand text-lg">{citizen.points ?? 0}</p>
                      <p className="text-xs text-slate-400">points</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Points Guide ──────────────────────────────────────────────────── */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Zap size={16} className="text-brand" />
            How to Earn Points
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {[
              { action: 'Report a verified issue', pts: '+75', icon: MapPin, color: 'text-amber-400' },
              { action: 'Your issue gets upvoted', pts: '+10', icon: ThumbsUp, color: 'text-purple-400' },
              { action: 'Issue resolved by AI', pts: '+100', icon: Shield, color: 'text-green-400' },
            ].map(({ action, pts, icon: Icon, color }) => (
              <div key={action} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <Icon size={18} className={color} />
                <div>
                  <p className="text-slate-300">{action}</p>
                  <p className={`font-bold ${color}`}>{pts} pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
