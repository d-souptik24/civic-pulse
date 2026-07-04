import { NavLink, Link } from 'react-router-dom';
import { MapPin, AlertCircle, Trophy, Settings, LogIn, LogOut, Home, PlusCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';

const navLinks = [
  { to: '/',            label: 'Home',         icon: Home },
  { to: '/report',      label: 'Report',      icon: PlusCircle },
  { to: '/issues',      label: 'Issues',      icon: AlertCircle },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/admin',       label: 'Admin',       icon: Settings },
];

export default function Navbar() {
  const { user, isAdmin, signInWithGoogle, logout } = useAuth();

  // Only show the Admin link to users with the admin Custom Claim
  const visibleLinks = navLinks.filter(link => link.label !== 'Admin' || isAdmin);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 h-16 bg-slate-900/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" id="nav-logo" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏙️</span>
          <span className="font-bold text-lg tracking-tight">
            Civic<span className="text-[#00D4AA]">Pulse</span>
          </span>
        </Link>

        {/* Nav links (Desktop only) */}
        <nav className="hidden md:flex items-center gap-1">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              id={`nav-link-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                 ${isActive
                   ? 'bg-[#00D4AA]/15 text-[#00D4AA]'
                   : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                 }`
              }
            >
              <Icon size={14} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Auth */}
        <div className="shrink-0 flex items-center gap-3">
          {user === undefined ? (
            // Still loading auth state
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          ) : user ? (
            // Logged in — show avatar + sign out
            <div className="flex items-center gap-2">
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-8 h-8 rounded-full ring-2 ring-[#00D4AA]/50 shrink-0"
              />
              <span className="text-sm text-slate-300 whitespace-nowrap hidden sm:block">{user.displayName?.split(' ')[0]}</span>
              <button
                id="btn-logout"
                onClick={logout}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 shrink-0"
              >
                <LogOut size={12} />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          ) : (
            // Not logged in
            <button
              id="btn-signin"
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00D4AA] hover:bg-[#00BF97] text-slate-900 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <LogIn size={14} />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation (Mobile only) */}
      <nav className="fixed bottom-0 inset-x-0 z-50 h-16 bg-slate-900/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around px-2 md:hidden">
        {visibleLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-semibold transition-all duration-200
               ${isActive
                 ? 'text-[#00D4AA]'
                 : 'text-slate-400 hover:text-slate-200'
               }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
