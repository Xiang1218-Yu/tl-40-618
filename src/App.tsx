import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import DashboardPage from "@/pages/DashboardPage";
import TeamsPage from "@/pages/TeamsPage";
import JudgesPage from "@/pages/JudgesPage";
import TopicsPage from "@/pages/TopicsPage";
import TournamentPage from "@/pages/TournamentPage";
import LiveMatchPage from "@/pages/LiveMatchPage";
import LiveMatchListPage from "@/pages/LiveMatchListPage";
import JudgeScoringPage from "@/pages/JudgeScoringPage";
import JudgeScoringListPage from "@/pages/JudgeScoringListPage";
import RankingPage from "@/pages/RankingPage";
import DanmakuSendPage from "@/pages/DanmakuSendPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/danmaku/:matchId" element={<DanmakuSendPage />} />
        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/judges" element={<JudgesPage />} />
                <Route path="/topics" element={<TopicsPage />} />
                <Route path="/tournament" element={<TournamentPage />} />
                <Route path="/live" element={<LiveMatchListPage />} />
                <Route path="/live/:matchId" element={<LiveMatchPage />} />
                <Route path="/judge" element={<JudgeScoringListPage />} />
                <Route path="/judge/:matchId" element={<JudgeScoringPage />} />
                <Route path="/ranking" element={<RankingPage />} />
                <Route path="*" element={<DashboardPage />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}
