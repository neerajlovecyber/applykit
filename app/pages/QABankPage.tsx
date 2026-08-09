import React, { useState, useEffect } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  HelpCircle,
  Trash2,
  Search,
  RefreshCw,
  BrainCircuit,
  Sparkles,
} from "lucide-react";
import type { QABankEntry } from "@/lib/main/db-queries";

export const QABankPage: React.FC = () => {
  const conveyor = useConveyor();
  const { activeProfile } = useProfileStore();

  const [entries, setEntries] = useState<QABankEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmClearAI, setShowConfirmClearAI] = useState(false);

  useEffect(() => {
    loadQABank();
  }, [activeProfile]);

  const loadQABank = async () => {
    if (!activeProfile) return;
    try {
      let list = await conveyor.data.getQABankEntries(activeProfile.id);
      if (!list || list.length === 0) {
        // Auto-seed default questions beforehand automatically
        await conveyor.data.seedDefaultQABank(activeProfile.id);
        list = await conveyor.data.getQABankEntries(activeProfile.id);
      }
      setEntries(list || []);
    } catch (err) {
      console.error("Failed to load QA bank:", err);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    await conveyor.data.deleteQABankEntry(id);
    loadQABank();
  };

  const handleClearAIAnswers = async () => {
    if (!activeProfile) return;
    try {
      await conveyor.data.clearAIGeneratedQABankEntries(activeProfile.id);
      setShowConfirmClearAI(false);
      loadQABank();
    } catch (err) {
      console.error("Failed to clear AI generated answers:", err);
    }
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.question_pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const aiEntriesCount = entries.filter((e) => e.source === "ai_generated").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Question & Answer Memory Bank</h2>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary flex items-center gap-1">
              <BrainCircuit className="h-3 w-3" /> QA Memory
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pre-loaded standard questions & learned answers for Naukri & LinkedIn forms.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirmClearAI(true)}
          disabled={aiEntriesCount === 0}
          className="gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
        >
          <Trash2 className="h-4 w-4" /> Clear AI Answers ({aiEntriesCount})
        </Button>
      </div>

      {/* Clear AI Answers Confirmation */}
      {showConfirmClearAI && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-rose-300 font-medium">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Are you sure you want to delete all ({aiEntriesCount}) AI-generated saved answers? Standard pre-loaded questions will remain intact.</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setShowConfirmClearAI(false)} className="h-7 text-xs">
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleClearAIAnswers} className="h-7 text-xs font-semibold">
              Yes, Delete AI Answers
            </Button>
          </div>
        </div>
      )}

      {/* Full-Width Q&A List */}
      <div className="space-y-4">
        {/* Search & Refresh Controls */}
        <div className="flex items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions or answers..."
              className="pl-9 h-8 text-xs"
            />
          </div>

          <Button size="sm" variant="ghost" onClick={loadQABank} className="gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh ({entries.length})
          </Button>
        </div>

        {/* Full-Width Stack of Q&A Cards */}
        <div className="space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
              No Q&A bank entries found.
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm hover:border-border transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                      <span>{entry.question_pattern}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-6">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono py-0">
                        {entry.source === "ai_generated" ? "AI_GENERATED" : "DEFAULT"}
                      </Badge>
                      <span>• Used {(entry as any).use_count ?? (entry as any).usage_count ?? 0} times</span>
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="h-7 w-7 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="ml-6 p-3 rounded-lg bg-muted/40 border border-border/40 text-xs font-mono text-foreground leading-relaxed">
                  {entry.answer}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
