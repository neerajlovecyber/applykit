import React, { useState, useEffect } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  HelpCircle,
  Plus,
  Trash2,
  Sparkles,
  Search,
  CheckCircle2,
  RefreshCw,
  MessageSquareText,
  BrainCircuit,
  Loader2,
} from "lucide-react";
import type { QABankEntry } from "@/lib/main/db-queries";

export const QABankPage: React.FC = () => {
  const conveyor = useConveyor();
  const { activeProfile } = useProfileStore();

  const [entries, setEntries] = useState<QABankEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // New Q&A state
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newType, setNewType] = useState("text");

  // AI Test Question state
  const [testQuestion, setTestQuestion] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadQABank();
  }, [activeProfile]);

  const loadQABank = async () => {
    if (!activeProfile) return;
    try {
      const list = await conveyor.data.getQABankEntries(activeProfile.id);
      setEntries(list);
    } catch (err) {
      console.error("Failed to load QA bank:", err);
    }
  };

  const handleSaveQA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !newQuestion.trim() || !newAnswer.trim()) return;

    await conveyor.data.upsertQABankEntry({
      profile_id: activeProfile.id,
      question_pattern: newQuestion.trim(),
      answer: newAnswer.trim(),
      question_type: newType,
      confidence: "high",
      source: "manual",
    });

    setNewQuestion("");
    setNewAnswer("");
    setIsAdding(false);
    loadQABank();
  };

  const handleDeleteEntry = async (id: string) => {
    await conveyor.data.deleteQABankEntry(id);
    loadQABank();
  };

  const handleTestAIQuestion = async () => {
    if (!activeProfile || !testQuestion.trim()) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const profileSummary = `Candidate: ${activeProfile.name}. Skills: ${activeProfile.skills}. Experience: ${activeProfile.experience_years} years (${activeProfile.seniority}). ${activeProfile.summary || ""}`;
      const aiAns = await (window as any).electron?.ipcRenderer?.invoke("llm:answer-question", {
        profileSummary,
        question: testQuestion,
      });

      setTestResult(aiAns || "No answer generated.");
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTesting(false);
    }
  };

  const filteredEntries = entries.filter((e) =>
    e.question_pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Question & Answer Memory Bank</h2>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary flex items-center gap-1">
              <BrainCircuit className="h-3 w-3" /> Learned QA Memory
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Stores learned answers for custom form questions. Reuses existing entries & falls back to Vercel AI SDK.
          </p>
        </div>

        <Button onClick={() => setIsAdding(!isAdding)} className="gap-2 text-xs">
          <Plus className="h-4 w-4" /> Add Learned Answer
        </Button>
      </div>

      {/* Inline Form to Add QA Entry */}
      {isAdding && (
        <form onSubmit={handleSaveQA} className="p-5 bg-card border border-primary/30 rounded-xl space-y-4 animate-in fade-in duration-200">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" /> Add Custom Question & Answer
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs">Question Pattern / Text</Label>
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="e.g. Do you have experience with WebSockets?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Field Type</Label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              >
                <option value="text">Text Input</option>
                <option value="radio">Yes/No Radio</option>
                <option value="select">Dropdown Choice</option>
                <option value="textarea">Long Essay</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Default Answer</Label>
            <Input
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="e.g. Yes, 4 years of experience building real-time apps with Socket.io and native WebSockets."
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Entry
            </Button>
          </div>
        </form>
      )}

      {/* AI Interactive Question Tester */}
      <div className="p-5 bg-card border border-border rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Test Vercel AI SDK Answer Generator
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={testQuestion}
            onChange={(e) => setTestQuestion(e.target.value)}
            placeholder="Type any tricky application form question to test AI answer output..."
            className="flex-1 text-xs"
          />
          <Button size="sm" onClick={handleTestAIQuestion} disabled={isTesting} className="gap-2 text-xs shrink-0">
            {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Test AI Answer
          </Button>
        </div>

        {testResult && (
          <div className="p-3 rounded-lg bg-primary/10 text-xs border border-primary/20 space-y-1">
            <div className="font-semibold text-primary">Generated Response:</div>
            <div className="text-foreground">{testResult}</div>
          </div>
        )}
      </div>

      {/* Q&A List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Q&A bank..."
              className="pl-9 text-xs"
            />
          </div>

          <Button size="sm" variant="ghost" onClick={loadQABank} className="gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh ({entries.length})
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.length === 0 ? (
            <div className="col-span-2 p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
              No Q&A bank entries found. Form automation will automatically learn answers and save them here!
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="p-4 bg-card border border-border rounded-xl space-y-3 relative group">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-medium text-sm text-foreground flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                      <span>{entry.question_pattern}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {entry.source}
                      </Badge>
                      <span>Used {entry.usage_count} times</span>
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="h-7 w-7 text-rose-400 hover:bg-rose-500/10 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-xs font-mono text-foreground">
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
