import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ShowListPage } from "@/pages/ShowListPage";
import { ShowDetailPage } from "@/pages/ShowDetailPage";
import { RunReportPage } from "@/pages/RunReportPage";
import { ReportViewPage } from "@/pages/ReportViewPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ShowListPage />} />
        <Route path="/shows/:showId" element={<ShowDetailPage />} />
        <Route path="/shows/:showId/run" element={<RunReportPage />} />
        <Route path="/shows/:showId/reports/:reportId" element={<ReportViewPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
