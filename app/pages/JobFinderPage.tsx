import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import { Search, MapPin, DollarSign, Plus, Check, Filter } from "lucide-react";

interface DiscoveredJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  platform: string;
  posted: string;
  added: boolean;
}

export const JobFinderPage: React.FC = () => {
  const [autoAdd, setAutoAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("Frontend Engineer");
  const [results, setResults] = useState<DiscoveredJob[]>([
    { id: "1", title: "Senior Frontend Engineer", company: "Stripe", location: "Remote, US", salary: "$160k - $190k", platform: "LinkedIn", posted: "2h ago", added: false },
    { id: "2", title: "React Developer", company: "Linear", location: "San Francisco, CA (Hybrid)", salary: "$140k - $170k", platform: "LinkedIn", posted: "4h ago", added: false },
    { id: "3", title: "Full Stack Engineer (Node + React)", company: "Vercel", location: "Remote", salary: "$150k - $180k", platform: "Lever", posted: "1d ago", added: false },
    { id: "4", title: "Staff UI Engineer", company: "Figma", location: "San Francisco, CA", salary: "$200k - $240k", platform: "Greenhouse", posted: "1d ago", added: false },
  ]);

  const handleAdd = (id: string) => {
    setResults(results.map((r) => (r.id === id ? { ...r, added: true } : r)));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Search Header & Auto-Add Toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div className="flex-1 w-full max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, skill, or company..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border border-border/50">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Auto-add matches</div>
            <div className="text-xs text-muted-foreground">Silently add profile matches to queue</div>
          </div>
          <Switch checked={autoAdd} onCheckedChange={setAutoAdd} />
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((job) => (
          <div key={job.id} className="p-5 bg-card border border-border rounded-xl space-y-4 hover:border-primary/40 transition-colors flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-base leading-snug">{job.title}</h3>
                  <div className="text-sm font-medium text-muted-foreground">{job.company}</div>
                </div>
                <Badge variant="secondary" className="text-xs">{job.platform}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {job.salary}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
              <span className="text-muted-foreground">Posted {job.posted}</span>
              {job.added ? (
                <Button size="sm" variant="outline" disabled className="gap-1 text-emerald-500 border-emerald-500/30">
                  <Check className="h-4 w-4" /> Added to Queue
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleAdd(job.id)} className="gap-1">
                  <Plus className="h-4 w-4" /> Add to Queue
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
