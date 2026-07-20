/**
 * client/src/lib/useFirstVisit.js
 *
 * Custom hook encapsulating the "has the user seen the landing page?" logic.
 *
 * Why a custom hook? (Audit AR2)
 * - Separates session-preference concern from routing/layout concern in App.jsx
 * - Makes it easy to add URL param override (?tour=true), A/B testing, or
 *   version-based resets in one place without touching routing code.
 * - Allows any child component to read `hasVisited` without prop-drilling.
 */
import { useState } from 'react';

const STORAGE_KEY = 'civicpulse_visited';

export function useFirstVisit() {
  const [hasVisited, setHasVisited] = useState(() => {
    // URL param override: ?tour=true forces the landing page regardless of flag.
    // Useful for demos, screenshots, and A/B test variants.
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tour') === 'true') return false;
    }
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const markVisited = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasVisited(true);
    
    // Clean up the URL if ?tour=true is present
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('tour')) {
        url.searchParams.delete('tour');
        // Replace the current history state with the cleaned URL
        window.history.replaceState({}, '', url.toString() || '/');
      }
    }
  };

  return { hasVisited, markVisited };
}
