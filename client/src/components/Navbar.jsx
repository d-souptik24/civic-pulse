import { NavLink, Link } from 'react-router-dom';
import { AlertCircle, Trophy, Settings, LogIn, LogOut, Home, PlusCircle, MapPin } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';

const navLinks = [
  { to: '/',            label: 'Home',         icon: Home },
  { to: '/report',      label: 'Report',       icon: PlusCircle },
  { to: '/issues',      label: 'Issues',       icon: AlertCircle },
  { to: '/leaderboard', label: 'Leaderboard',  icon: Trophy },
  { to: '/admin',       label: 'Admin',        icon: Settings },
];

export default function Navbar() {
  const { user, isAdmin, signInWithGoogle, logout } = useAuth();

  // Only show the Admin link to users with the admin Custom Claim
  const visibleLinks = navLinks.filter(link => link.label !== 'Admin' || isAdmin);

  return (
    <>
      {/* ── Desktop / Tablet Header ────────────────────────────────────────── */}
      <header
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(222, 218, 210, 0.6)',
          boxShadow: '0 4px 20px -2px rgba(34, 31, 38, 0.05)',
        }}
        className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6 rounded-2xl"
      >
        {/* Logo — Plum rounded-square icon + "Civic" in Ink / "Pulse" in Plum */}
        <Link
          to="/"
          className="navbar-logo-container flex items-center gap-2 shrink-0 focus-visible:outline-none rounded-lg no-underline hover:no-underline"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="32" 
            height="32" 
            viewBox="212 212 600 600"
            style={{ flexShrink: 0 }}
          >
            <path fill="var(--color-plum)" d="M498.699 319.289C509.176 318.768 519.572 319.055 530.032 319.743C559.827 321.701 621.879 329.866 647.471 342.46C658.729 347.999 667.977 355.754 676.188 365.185C681.998 371.823 686.791 379.286 690.41 387.331C695.518 398.464 700.068 415.575 702.713 427.607C710.841 463.024 713.907 499.414 711.819 535.691C704.542 535.705 674.017 537.508 669.6 533.972C667.762 532.501 666.95 529.496 666.632 527.287C665.955 522.571 666.484 517.309 666.516 512.536L666.583 480.586C666.586 474.841 667.057 468.615 666.272 462.937C665.795 459.488 664.76 456.637 661.582 454.89C650.401 448.745 595.059 456.411 588.1 450.715C585.977 448.977 584.674 446.082 584.224 443.424C583.073 436.636 583.998 428.252 584.016 421.303L584.14 382.896C584.166 374.853 584.381 365.991 583.866 358.051C582.03 354.839 579.282 351.625 575.24 351.474C553.589 350.663 531.745 351.425 510.071 351.645C503.363 351.713 500.846 356.204 500.241 362.387C500.271 371.66 501.794 416.172 498.527 421.656C497.019 424.188 493.96 425.282 491.208 425.822C483.964 427.246 475.427 426.321 467.999 426.32L421.565 426.346C416.23 426.349 407.889 425.387 402.996 427.374C400.807 428.263 399.083 430.725 398.426 432.925C396.958 437.839 397.717 444.733 397.733 449.844C397.758 457.805 398.91 505.619 396.979 509.783C396.418 510.993 395.359 511.833 394.005 511.998C392.814 512.143 391.882 511.855 391.015 511.004C387.325 507.385 389.359 488.895 389.189 483.33C389.134 481.53 388.861 478.464 387.13 477.38C383.303 474.982 353.976 475.645 347.964 476.039C345.467 476.202 340.519 477 339.126 479.451C336.551 483.981 339.751 519.151 338.601 528.072C338.388 529.726 337.83 531.287 336.672 532.518C332.005 537.48 318.489 535.725 311.864 535.661L311.813 534.784C309.298 489.834 314.396 441.538 328.649 398.59C336.051 376.283 348.67 359.214 368.764 346.382C378.888 339.917 392.03 336.441 403.591 333.076C434.575 324.054 466.595 321.08 498.699 319.289Z"/>
            <path fill="var(--color-plum)" d="M471.232 568.327C472.104 569.151 477.3 596.667 478.501 600.987C483.86 620.261 490.762 641.784 500.533 659.19C504.811 666.811 514.006 677.1 522.685 678.822C529.023 680.08 535.781 678.696 541.016 675.015C569.105 655.261 580.528 599.679 587.513 567.921C616.909 617.284 649.106 611.063 698.499 611.582C692.337 644.379 672.181 671.38 641.132 684.312C632.727 687.683 624.127 690.546 615.378 692.885C597.721 697.717 581.826 699.795 563.709 701.937C514.22 707.786 463.891 705.3 415.292 694.178C393.372 688.943 371.91 683.285 355.216 667.147C337.124 649.657 331.155 634.878 324.911 611.516C337.489 611.226 352.581 611.481 365.183 611.711C410.282 612.533 448.093 614.281 471.232 568.327Z"/>
            <path fill="var(--color-plum)" d="M474.01 453.086C497.898 450.498 508.813 527.334 512.378 544.317C515.405 559.274 518.88 574.136 522.798 588.884C523.748 592.577 525.531 605.538 528.944 606.201C532.528 603.894 551.918 528.815 555.058 518.196C556.494 513.37 558.149 508.613 560.017 503.937C563.269 495.948 567.554 488.058 573.501 481.737C576.318 478.742 579.958 476.157 584.236 476.203C604.266 476.415 618.541 528.325 625.569 542.863C627.933 547.753 631.148 552.617 635.027 556.44C638.814 560.171 643.402 562.646 648.54 563.955C657.993 566.362 668.748 565.311 678.459 565.209L708.275 564.903C707.614 571.56 704.189 587.744 702.676 594.62C693.102 594.423 682.335 594.553 672.692 594.614C653.153 594.737 641.616 594.818 625.093 583.113C617.786 577.915 611.677 571.213 607.177 563.457C602.336 555.142 589.436 520.362 583.915 516.296L583.177 516.664C579.611 522.84 574.623 550.865 572.708 559.617C568.912 580.457 563.014 603.997 555.28 623.669C552.46 630.729 548.661 637.317 544.996 643.955C541.339 650.58 535.717 662.242 526.495 660.795C524.086 660.419 521.85 659.313 520.09 657.626C501.88 640.25 487.773 558.56 482.255 533.058C481.068 527.572 478.572 511.409 475.946 507.77L474.969 507.741C474.109 508.411 473.359 509.462 473.08 510.518C466.427 535.706 459.328 559.881 440.917 579.419C423.23 598.188 403.586 594.585 380.152 594.564L320.765 594.564C318.81 585.22 316.818 574.509 315.743 565C330.63 564.7 345.827 565.192 360.732 565.033C374.893 564.882 389.284 566.152 402.977 562.101C411.543 559.653 419.152 554.637 424.777 547.728C443.566 524.187 444.527 461.675 474.01 453.086Z"/>
          </svg>
          {/* Wordmark: Civic in Ink, Pulse in Plum */}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '18px',
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
            }}
          >
            Civic<span style={{ color: 'var(--color-plum)' }}>Pulse</span>
          </span>
        </Link>

        {/* Nav links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              id={`nav-link-${label.toLowerCase()}`}
              className="nav-link-custom"
            >
              <Icon size={14} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Auth */}
        <div className="shrink-0 flex items-center gap-3">
          {user === undefined ? (
            // Loading auth state
            <div
              className="w-8 h-8 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-stone-line)' }}
            />
          ) : user ? (
            // Logged in
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="navbar-avatar w-8 h-8 rounded-full shrink-0"
                />
                <span
                  className="text-sm whitespace-nowrap hidden sm:block"
                  style={{ color: 'var(--color-ink)', fontWeight: 500 }}
                >
                  {user.displayName?.split(' ')[0]}
                </span>
              </div>
              <button
                id="btn-logout"
                onClick={logout}
                className="btn-logout-custom"
              >
                <LogOut size={12} />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          ) : (
            // Not logged in — Primary Button (Plum fill)
            <button
              id="btn-signin"
              onClick={signInWithGoogle}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', gap: '6px' }}
            >
              <LogIn size={14} />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Mobile Bottom Navigation ────────────────────────────────────────── */}
      <nav
        aria-label="Mobile navigation"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(222, 218, 210, 0.6)',
          boxShadow: '0 -4px 20px rgba(34, 31, 38, 0.03)',
        }}
        className="fixed bottom-0 inset-x-0 z-50 h-16 flex items-stretch justify-around px-1 lg:hidden"
      >
        {visibleLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="mobile-nav-link flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] px-1 text-[10px] font-semibold transition-all duration-150 focus-visible:outline-none rounded-md hover:no-underline"
            style={({ isActive }) => ({
              fontFamily: 'var(--font-body)',
              color: isActive ? 'var(--color-plum)' : 'var(--color-fog)',
            })}
          >
            <Icon size={20} aria-hidden="true" strokeWidth={2} className="mobile-nav-icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
