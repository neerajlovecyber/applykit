import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { KeepAlivePages } from "@/app/components/KeepAlivePages";
import "./styles/app.css";

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <KeepAlivePages />
      </AppLayout>
    </BrowserRouter>
  );
}
