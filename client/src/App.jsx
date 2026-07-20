import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ReportWizard from './pages/ReportWizard.jsx';
import IssueDetail from './pages/IssueDetail.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import IssuesList from './pages/IssuesList.jsx';
import AdminPage from './pages/AdminPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import { useFirstVisit } from './lib/useFirstVisit.js';

export default function App() {
  // Audit AR2: First-visit logic extracted to a dedicated custom hook.
  // Separates session-preference concern from routing/layout concern.
  // Also supports ?tour=true URL param override for demos.
  const { hasVisited, markVisited } = useFirstVisit();

  return (
    <BrowserRouter>
      {hasVisited && <Navbar />}
      <main className={hasVisited ? '' : 'overflow-hidden'}>
        <Routes>
          <Route
            path="/"
            element={
              hasVisited ? (
                <Dashboard />
              ) : (
                <LandingPage onGetStarted={markVisited} />
              )
            }
          />
          <Route path="/report"      element={<ReportWizard />} />
          <Route path="/issues"      element={<IssuesList />} />
          <Route path="/issues/:id"  element={<IssueDetail />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin"       element={<AdminPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
