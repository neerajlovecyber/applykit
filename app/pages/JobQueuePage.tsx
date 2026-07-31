import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Plus, Trash2, RotateCw, ExternalLink, Play, Search, Filter } from "lucide-react";
import { useQueueStore } from "@/app/stores/queue-store";

interface JobItem {
  id: string;
  title: string;
  company: string;
  source: string;
  status: "queued" | "running" | "done" | "failed";
  addedAt: string;
  url: string;
}

export const JobQueuePage: React.FC = () => {
  const { isRunning, startQueue, pauseQueue } = useQueueStore();
  const [urlInput, setUrlInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([
    { id: "1", title: "Frontend Engineer", company: "Stripe", source: "LinkedIn", status: "queued", addedAt: "Today", url: "https://linkedin.com" },
    { id: "2", title: "Senior React Developer", company: "Vercel", source: "Lever", status: "queued", addedAt: "Today", url: "https://lever.co" },
    { id: "3", title: "Full Stack Engineer", company: "Linear", source: "Greenhouse", status: "failed", addedAt: "Yesterday", url: "https://greenhouse.io" },
    { id: "4", title: "UI Architect", company: "Figma", source: "LinkedIn", status: "done", addedAt: "Yesterday", url: "https://linkedin.com" },
  ]);

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    let source = "Manual";
    if (urlInput.includes("linkedin")) source = "LinkedIn";
    else if (urlInput.includes("lever")) source = "Lever";
    else if (urlInput.includes("greenhouse")) source = "Greenhouse";

    const newJob: JobItem = {
      id: Date.now().toString(),
      title: "Software Engineer",
      company: "Discovered Company",
      source,
      status: "queued",
      addedAt: "Just now",
      url: urlInput,
    };

    setJobs([newJob, ...jobs]);
    setUrlInput("");
  };

  const handleRemove = (id: string) => {
    setJobs(jobs.filter((j) => j.id !== id));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(jobs.map((j) => j.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const clearCompleted = () => {
    setJobs(jobs.filter((j) => j.status !== "done"));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl">
        <form onSubmit={handleAddJob} className="flex gap-2 w-full md:w-auto flex-1 max-w-lg">
          <Input
            placeholder="Paste job URL (LinkedIn, Lever, Greenhouse)..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" className="gap-2">
            <Plus className="h-4 w-4" /> Add to Queue
          </Button>
        </form>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setJobs(jobs.filter((j) => !selectedIds.includes(j.id)))}>
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={clearCompleted}>
            Clear Completed
          </Button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-medium">
            <tr>
              <th className="p-4 w-10">
                <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === jobs.length && jobs.length > 0} />
              </th>
              <th className="p-4">Job & Company</th>
              <th className="p-4">Source</th>
              <th className="p-4">Status</th>
              <th className="p-4">Added</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No jobs in queue. Paste a URL above to get started.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <input type="checkbox" checked={selectedIds.includes(job.id)} onChange={() => handleToggleSelect(job.id)} />
                  </td>
                  <td className="p-4 font-medium">
                    <div>{job.title}</div>
                    <div className="text-xs text-muted-foreground">{job.company}</div>
                  </td>
                  <td className="p-4 text-muted-foreground">{job.source}</td>
                  <td className="p-4">
                    {job.status === "queued" && <Badge variant="secondary">Queued</Badge>}
                    {job.status === "running" && <Badge variant="default" className="bg-amber-500">Applying...</Badge>}
                    {job.status === "done" && <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">Applied</Badge>}
                    {job.status === "failed" && <Badge variant="destructive">Failed</Badge>}
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">{job.addedAt}</td>
                  <td className="p-4 text-right space-x-2">
                    <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button onClick={() => handleRemove(job.id)} className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
