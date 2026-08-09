import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import icon from "@/app/assets/applykit-light-rounded.png";
import { WindowContextProvider, menuItems } from "@/app/components/window";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./app";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 min cache — avoids re-fetching on every render
    },
  },
});

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <WindowContextProvider titlebar={{ title: "ApplyKit", icon, menuItems }}>
          <App />
        </WindowContextProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
);
