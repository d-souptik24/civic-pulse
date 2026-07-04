import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ReportWizard from './pages/ReportWizard.jsx';
import IssueDetail from './pages/IssueDetail.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import IssuesList from './pages/IssuesList.jsx';
import AdminPage from './pages/AdminPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/"            element={<Dashboard />} />
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
