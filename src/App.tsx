import { HashRouter, Routes, Route } from "react-router-dom";
import { ShowListPage } from "@/pages/ShowListPage";
import { ShowDetailPage } from "@/pages/ShowDetailPage";
import { RunReportPage } from "@/pages/RunReportPage";
import { ReportViewPage } from "@/pages/ReportViewPage";

// HashRouter (not BrowserRouter) because DeckCheck is hosted as a static bundle
// on GitHub Pages: a deep link like /shows/:id refreshed with history-mode
// routing 404s on Pages (there's no server to fall back to index.html), while
// hash-based routes (/#/shows/:id) always resolve to the same static index.html.
function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ShowListPage />} />
        <Route path="/shows/:showId" element={<ShowDetailPage />} />
        <Route path="/shows/:showId/run" element={<RunReportPage />} />
        <Route path="/shows/:showId/reports/:reportId" element={<ReportViewPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
