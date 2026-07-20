import { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Trophy, Star, Shield, Zap, Droplets, MapPin, ThumbsUp, Award } from 'lucide-react';

// ── Badge Configuration (single Sprout/Green accent per design system) ────────
const BADGE_CONFIG = {
  'Pothole Patrol':   { icon: MapPin,   desc: 'Reported a pothole' },
  'Water Warden':     { icon: Droplets, desc: 'Reported a water leak' },
  'Light Keeper':     { icon: Zap,      desc: 'Reported a streetlight issue' },
  'Upvote Champion':  { icon: ThumbsUp, desc: 'Gave 20 upvotes to the community' },
  'Community Savior': { icon: Shield,   desc: 'Had an issue verified as resolved by AI' },
};

// ── Rank Medal Display ────────────────────────────────────────────────────────
function RankMedal({ rank }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="font-bold text-lg w-8 text-center" style={{ color: 'var(--color-fog)' }}>#{rank}</span>;
}

// ── Badge Chip — unified sprout accent (per design system single-accent rule) ─
function BadgeChip({ name }) {
  const config = BADGE_CONFIG[name];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium"
      style={{
        color: 'var(--color-signal-green)',
        backgroundColor: 'rgba(62,122,84,0.1)',
        border: '1px solid rgba(62,122,84,0.2)',
        borderRadius: 'var(--radius-chip)',
      }}
      title={config.desc}
    >
      <Icon size={10} />
      {name}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card-white p-4 flex flex-col items-center gap-1 text-center transition-all duration-200 ${
        onClick 
          ? 'cursor-pointer hover:scale-[1.03] hover:border-[var(--color-plum-light)] hover:shadow-md hover:bg-[#F8F6F4]' 
          : 'cursor-default'
      }`}
    >
      <Icon size={20} style={{ color: 'var(--color-plum)' }} />
      <p className="text-2xl font-bold" style={{ color: 'var(--color-ink)', letterSpacing: '-0.48px' }}>{value ?? 0}</p>
      <p className="text-xs" style={{ color: 'var(--color-fog)' }}>{label}</p>
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

    const lastBadgeTs = myProfile.lastBadgeAwardedAt;
    if (!lastBadgeTs) return;

    const lastBadgeMs = lastBadgeTs.toMillis ? lastBadgeTs.toMillis() : lastBadgeTs * 1000;
    const nowMs = Date.now();
    const sixtySeconds = 60 * 1000;

    if (nowMs - lastBadgeMs < sixtySeconds) {
      confettiFired.current = true;
      confetti({ particleCount: 120, spread: 70, origin: { x: 0.3, y: 0.6 }, colors: ['#27ae60', '#defaca', '#FFD700', '#f49a40'] });
      setTimeout(() => {
        confetti({ particleCount: 120, spread: 70, origin: { x: 0.7, y: 0.6 }, colors: ['#27ae60', '#defaca', '#FFD700', '#f49a40'] });
      }, 200);
    }
  }, [myProfile]);

  return (
    <div
      className="min-h-screen pt-20 pb-24 md:pb-12 px-4 animate-fade-in"
      style={{ backgroundColor: 'var(--color-stone-paper)' }}
    >
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="text-center py-4">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-4"
            style={{ backgroundColor: 'rgba(75, 46, 70, 0.08)', border: '1px solid rgba(75, 46, 70, 0.15)', color: 'var(--color-plum)' }}
          >
            <Trophy size={14} />
            Community Leaderboard
          </div>
          <h1
            className="font-bold mb-2"
            style={{ fontSize: 'var(--text-heading)', lineHeight: 'var(--leading-heading)', color: 'var(--color-ink)' }}
          >
            Top Citizens
          </h1>
          <p style={{ color: 'var(--color-fog)' }}>Earn points by reporting, upvoting, and resolving issues in your community.</p>
        </div>

        {/* ── My Stats (only shown when logged in) ─────────────────── */}
        {user && myProfile && (
          <div className="card-white p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-12 h-12 rounded-full shrink-0"
                style={{ boxShadow: '0 0 0 2px var(--color-plum)' }}
              />
              <div>
                <p className="font-semibold" style={{ color: 'var(--color-ink)' }}>{user.displayName}</p>
                <p className="text-sm" style={{ color: 'var(--color-fog)' }}>Your stats</p>
              </div>
              <div
                className="ml-auto flex items-center gap-2 px-3 py-1.5"
                style={{ backgroundColor: 'rgba(75, 46, 70, 0.08)', border: '1px solid rgba(75, 46, 70, 0.15)', borderRadius: 'var(--radius-chip)', color: 'var(--color-plum)' }}
              >
                <Star size={14} />
                <span className="font-bold text-sm">Rank #{myRank}</span>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Points"   value={myProfile.points}        icon={Star}   />
              <StatCard label="Reports"  value={myProfile.reportsCount}  icon={MapPin} onClick={() => navigate('/issues?reporter=me')} />
              <StatCard label="Resolved" value={myProfile.issuesResolved} icon={Shield} />
            </div>

            {/* Badges */}
            {myProfile.badges && myProfile.badges.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--color-fog)' }}>Your Badges</p>
                <div className="flex flex-wrap gap-2">
                  {myProfile.badges.map(badge => (
                    <BadgeChip key={badge} name={badge} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Top 10 List ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="px-1 flex items-center gap-2">
            <Award size={18} style={{ color: 'var(--color-plum)' }} />
            <h2 className="font-bold text-lg" style={{ color: 'var(--color-ink)' }}>Top 10 Citizens</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card-white p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-6 rounded" style={{ backgroundColor: 'var(--color-stone-line)' }} />
                  <div className="w-10 h-10 rounded-full" style={{ backgroundColor: 'var(--color-stone-line)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded w-32" style={{ backgroundColor: 'var(--color-stone-line)' }} />
                    <div className="h-2 rounded w-20" style={{ backgroundColor: 'var(--color-stone-paper)' }} />
                  </div>
                  <div className="h-4 rounded w-16" style={{ backgroundColor: 'var(--color-stone-line)' }} />
                </div>
              ))}
            </div>
          ) : topUsers.length === 0 ? (
            <div className="card-white p-12 text-center" style={{ color: 'var(--color-fog)' }}>
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p>No citizens on the board yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topUsers.map((citizen) => {
                const isMe = user && citizen.id === user.uid;
                return (
                  <div
                    key={citizen.id}
                    onClick={() => navigate(`/issues?reporter=${citizen.id}&name=${encodeURIComponent(citizen.displayName || 'Citizen')}`)}
                    className={`card-white p-4 flex items-center gap-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                      isMe ? 'hover:bg-[#F5EEF5]' : 'hover:bg-[#F8F6F4]'
                    }`}
                    style={{
                      borderLeftWidth: isMe ? '4px' : '1px',
                      borderLeftColor: isMe ? 'var(--color-plum)' : 'var(--color-stone-line)',
                      borderColor: isMe ? 'var(--color-plum-light)' : 'var(--color-stone-line)',
                      backgroundColor: isMe ? '#FAF6FA' : 'var(--color-stone-white)',
                    }}
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
                        className="w-10 h-10 rounded-full shrink-0"
                        style={{ boxShadow: '0 0 0 1px var(--color-stone-line)' }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--color-stone-paper)', border: '1px solid var(--color-stone-line)' }}
                      >
                        <span className="font-semibold text-sm" style={{ color: 'var(--color-plum)' }}>
                          {citizen.displayName?.[0] ?? '?'}
                        </span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
                          {citizen.displayName ?? 'Anonymous'}
                          {isMe && <span className="text-xs ml-1 font-normal" style={{ color: 'var(--color-plum)' }}>(You)</span>}
                        </p>
                      </div>
                      {citizen.badges && citizen.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {citizen.badges.slice(0, 3).map(badge => (
                            <BadgeChip key={badge} name={badge} />
                          ))}
                          {citizen.badges.length > 3 && (
                            <span className="text-xs" style={{ color: 'var(--color-fog)' }}>+{citizen.badges.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Points */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg" style={{ color: 'var(--color-plum)' }}>{citizen.points ?? 0}</p>
                      <p className="text-xs" style={{ color: 'var(--color-fog)' }}>points</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Points Guide ─────────────────────────────────────────── */}
        <div className="card-white p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
            <Zap size={16} style={{ color: 'var(--color-plum)' }} />
            How to Earn Points
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {[
              { action: 'Report a verified issue', pts: '+75',  icon: MapPin  },
              { action: 'Your issue gets upvoted', pts: '+10',  icon: ThumbsUp },
              { action: 'Issue resolved by AI',    pts: '+100', icon: Shield  },
            ].map(({ action, pts, icon: Icon }) => (
              <div
                key={action}
                className="flex items-center gap-3 p-3"
                style={{ backgroundColor: 'var(--color-stone-paper)', borderRadius: '16px', border: '1px solid var(--color-stone-line)' }}
              >
                <Icon size={18} style={{ color: 'var(--color-plum)' }} />
                <div>
                  <p style={{ color: 'var(--color-ink)' }}>{action}</p>
                  <p className="font-bold" style={{ color: 'var(--color-signal-green)' }}>{pts} pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
