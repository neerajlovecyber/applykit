import React from "react";

export const OpenAIIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0813 3.5906-2.0736a.798.798 0 0 0 .3968-.6866v-5.0691l1.5173.8761a.071.071 0 0 1 .038.0524v4.1481a4.4983 4.4983 0 0 1-2.8082 3.8748zm-8.7758-3.8344a4.4707 4.4707 0 0 1-.5351-3.0037l.142.0854 3.5906 2.0737a.8075.8075 0 0 0 .801 0l4.3892-2.534v1.7523a.0759.0759 0 0 1-.0333.0617l-3.5906 2.0737a4.5126 4.5126 0 0 1-4.7638-.5091zm-1.1378-9.521a4.4755 4.4755 0 0 1 2.3413-1.9629v4.2952a.798.798 0 0 0 .3968.6866l4.3892 2.534-1.5173.8761a.071.071 0 0 1-.0713 0l-3.5906-2.0737a4.5031 4.5031 0 0 1-1.9474-4.4553zm10.741-5.111a4.4707 4.4707 0 0 1 2.8764 1.0408l-.1419.0813-3.5906 2.0736a.798.798 0 0 0-.3968.6866v5.0691l-1.5173-.8761a.071.071 0 0 1-.038-.0524V8.8354a4.4983 4.4983 0 0 1 2.8082-3.8748zm8.7758 3.8344a4.4707 4.4707 0 0 1 .5351 3.0037l-.142-.0854-3.5906-2.0737a.8075.8075 0 0 0-.801 0l-4.3892 2.534V9.674a.0759.0759 0 0 1 .0333-.0617l3.5906-2.0737a4.5126 4.5126 0 0 1 4.7638.5091zm-1.637 6.452a4.4755 4.4755 0 0 1-2.3413 1.9629v-4.2952a.798.798 0 0 0-.3968-.6866l-4.3892-2.534 1.5173-.8761a.071.071 0 0 1 .0713 0l3.5906 2.0737a4.5031 4.5031 0 0 1 1.9474 4.4553z" />
  </svg>
);

export const GeminiIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
  </svg>
);

export const OpenRouterIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M7 12h10M12 7v10" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

export const ProviderIcon: React.FC<{ providerId: string; className?: string }> = ({ providerId, className = "h-5 w-5" }) => {
  if (providerId === "openai") return <OpenAIIcon className={className} />;
  if (providerId === "gemini") return <GeminiIcon className={className} />;
  return <OpenRouterIcon className={className} />;
};
