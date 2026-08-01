import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { JobQueuePage } from "@/app/pages/JobQueuePage";
import { JobFinderPage } from "@/app/pages/JobFinderPage";
import { RoleProfilesPage } from "@/app/pages/RoleProfilesPage";
import { DocumentsPage } from "@/app/pages/DocumentsPage";
import { QABankPage } from "@/app/pages/QABankPage";
import { HistoryPage } from "@/app/pages/HistoryPage";
import { SettingsPage } from "@/app/pages/SettingsPage";
import "./styles/app.css";

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/queue" element={<JobQueuePage />} />
          <Route path="/finder" element={<JobFinderPage />} />
          <Route path="/profiles" element={<RoleProfilesPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/qabank" element={<QABankPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
