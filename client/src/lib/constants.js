/**
 * client/src/lib/constants.js
 *
 * Single source of truth for all design-system color tokens.
 *
 * Three semantic domains kept SEPARATE — do not merge them:
 *
 *  1. STATUS_CONFIG   — keyed by issue.status string enum
 *                       (pending | unverified | open | in_progress | escalated | resolved)
 *
 *  2. STATUS_COLORS_HEX — same status keys but in raw HEX for Canvas / Google Maps
 *
 *  3. VERDICT_COLORS  — keyed by boolean results from AI pipeline verdicts
 *                       (Pipeline 1 authenticity, Pipeline 5 resolution)
 *                       These are NOT status strings — forcing them through STATUS_CONFIG
 *                       is a category error.
 */

// ── 1. STATUS_CONFIG (Tailwind classes) ───────────────────────────────────────
export const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: 'text-slate-400',  bg: 'bg-slate-400/10',  border: 'border-slate-400/30'  },
  unverified:  { label: 'Unverified',  color: 'text-slate-400',  bg: 'bg-slate-400/10',  border: 'border-slate-400/30'  },
  open:        { label: 'Open',        color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30'  },
  in_progress: { label: 'In Progress', color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
  escalated:   { label: 'Escalated',   color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    },
  resolved:    { label: 'Resolved',    color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/30'  },
};

// Convenience flat maps for components that only need text color or bg
// (replaces the old separate STATUS_COLORS / STATUS_BG objects in Dashboard.jsx)
export const STATUS_COLOR_CLASS = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.color])
);
export const STATUS_BG_CLASS = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.bg])
);

// ── 2. STATUS_COLORS_HEX (Canvas / Google Maps — NOT Tailwind) ────────────────
// Used exclusively by Map.jsx for marker fillColor.
// Matches the Tailwind palette used in STATUS_CONFIG.
export const STATUS_COLORS_HEX = {
  pending:     '#94a3b8', // slate-400
  unverified:  '#94a3b8', // slate-400
  open:        '#f59e0b', // amber-500
  in_progress: '#3b82f6', // blue-500
  escalated:   '#ef4444', // red-500
  resolved:    '#27ae60', // sprout green
};

// ── 3. VERDICT_COLORS (boolean pipeline verdicts) ─────────────────────────────
// For Pipeline 1 (aiAuthenticity boolean) and Pipeline 5 (verdict.resolved boolean).
// Kept separate because these are independent of issue.status entirely.
export const VERDICT_COLORS = {
  success: {
    text:   'text-green-400',
    bg:     'bg-green-400/10',
    border: 'border-green-400/20',
  },
  failure: {
    text:   'text-red-400',
    bg:     'bg-red-400/10',
    border: 'border-red-400/20',
  },
  neutral: {
    text:   'text-slate-400',
    bg:     'bg-slate-400/10',
    border: 'border-slate-400/20',
  },
};
