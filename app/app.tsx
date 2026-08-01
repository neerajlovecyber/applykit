import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { JobQueuePage } from "@/app/pages/JobQueuePage";
import { JobFinderPage } from "@/app/pages/JobFinderPage";
import { RoleProfilesPage } from "@/app/pages/RoleProfilesPage";
import { HistoryPage } from "@/app/pages/HistoryPage";
import { SettingsPage } from "@/app/pages/SettingsPage";
import "./styles/app.css";

import Web3DashboardDemo from "../components/watermelon/web3-dashboard/demo";

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
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
