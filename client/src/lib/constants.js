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
  open:        { label: 'Open',        color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/30'    },
  in_progress: { label: 'In Progress', color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/30'  },
  escalated:   { label: 'Escalated',   color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
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
  open:        '#f87171', // red-400
  in_progress: '#fbbf24', // amber-400
  escalated:   '#fb923c', // orange-400
  resolved:    '#4ade80', // green-400
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
