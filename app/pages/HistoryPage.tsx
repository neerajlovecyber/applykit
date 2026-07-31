import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Download, Search, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

interface HistoryRecord {
  id: string;
  jobTitle: string;
  company: string;
  platform: string;
  appliedDate: string;
  status: "applied" | "failed";
  profileName: string;
  url: string;
}

export const HistoryPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [records] = useState<HistoryRecord[]>([
    { id: "1", jobTitle: "Senior Frontend Engineer", company: "Stripe", platform: "LinkedIn", appliedDate: "2026-07-31", status: "applied", profileName: "Frontend Engineer", url: "https://linkedin.com" },
    { id: "2", jobTitle: "React Developer", company: "Vercel", platform: "Lever", appliedDate: "2026-07-30", status: "applied", profileName: "Frontend Engineer", url: "https://lever.co" },
    { id: "3", jobTitle: "Full Stack Engineer", company: "Linear", platform: "Greenhouse", appliedDate: "2026-07-29", status: "failed", profileName: "Full Stack Engineer", url: "https://greenhouse.io" },
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Application History</h2>
          <p className="text-sm text-muted-foreground">Log of all processed and submitted job applications</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filter / Search */}
      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter history by job title or company..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-medium">
            <tr>
              <th className="p-4">Job Title & Company</th>
              <th className="p-4">Platform</th>
              <th className="p-4">Profile Used</th>
              <th className="p-4">Status</th>
              <th className="p-4">Date Applied</th>
              <th className="p-4 text-right">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {records.map((rec) => (
              <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-4 font-medium">
                  <div>{rec.jobTitle}</div>
                  <div className="text-xs text-muted-foreground">{rec.company}</div>
                </td>
                <td className="p-4 text-muted-foreground">{rec.platform}</td>
                <td className="p-4 text-muted-foreground">{rec.profileName}</td>
                <td className="p-4">
                  {rec.status === "applied" ? (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Applied
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" /> Failed
                    </Badge>
                  )}
                </td>
                <td className="p-4 text-xs text-muted-foreground">{rec.appliedDate}</td>
                <td className="p-4 text-right">
                  <a href={rec.url} target="_blank" rel="noreferrer" className="inline-flex items-center p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
