import React, { useState, useEffect } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  FileText,
  Upload,
  Sparkles,
  Trash2,
  Eye,
  FileCheck,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Search,
  BookOpen,
  Loader2,
} from "lucide-react";
import type { DocumentEntry } from "@/lib/documents/types";

export const DocumentsPage: React.FC = () => {
  const conveyor = useConveyor();
  const { activeProfile } = useProfileStore();

  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentEntry | null>(null);
  const [copied, setCopied] = useState(false);

  // New Document upload state
  const [rawText, setRawText] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<"resume" | "cover_letter" | "portfolio">("resume");
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [activeProfile]);

  const loadDocuments = async () => {
    if (!activeProfile) return;
    try {
      const list = await conveyor.data.getDocuments(activeProfile.id);
      setDocuments(list);
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  const handleUploadAndParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !rawText.trim()) return;

    setIsParsing(true);
    try {
      // 1. Save document to SQLite DB
      const newDoc = await conveyor.data.insertDocument({
        profile_id: activeProfile.id,
        name: docName.trim() || `Resume — ${new Date().toLocaleDateString()}`,
        type: docType,
        content_text: rawText.trim(),
        is_primary: documents.length === 0,
      });

      // 2. Parse text with Vercel AI SDK and update active profile
      const parsed = await (window as any).electron?.ipcRenderer?.invoke("llm:parse-resume", rawText.trim());
      if (parsed) {
        await conveyor.data.upsertProfile({
          ...activeProfile,
          name: parsed.name || activeProfile.name,
          email: parsed.email || activeProfile.email,
          phone: parsed.phone || activeProfile.phone,
          location: parsed.location || activeProfile.location,
          skills: parsed.skills?.length ? parsed.skills.join(", ") : activeProfile.skills,
          seniority: parsed.seniority || activeProfile.seniority,
          experience_years: parsed.experienceYears || activeProfile.experience_years,
          summary: parsed.summary || activeProfile.summary,
        });
      }

      setRawText("");
      setDocName("");
      setIsUploading(false);
      loadDocuments();
    } catch (err) {
      console.error("Parse resume error:", err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    await conveyor.data.deleteDocument(id);
    if (selectedDoc?.id === id) setSelectedDoc(null);
    loadDocuments();
  };

  const handleCopyContent = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Document Library & Resume Engine</h2>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary flex items-center gap-1">
              <FileCheck className="h-3 w-3" /> Resumes & Cover Letters
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage source resumes, AI-tailored versions, and cover letters with Vercel AI SDK text extraction.
          </p>
        </div>

        <Button onClick={() => setIsUploading(!isUploading)} className="gap-2 text-xs">
          <Upload className="h-4 w-4" /> Add / Parse Document
        </Button>
      </div>

      {/* Upload & AI Parse Box */}
      {isUploading && (
        <form onSubmit={handleUploadAndParse} className="p-5 bg-card border border-primary/30 rounded-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Paste Resume / Document Text for AI Extraction
            </h3>
            <Badge variant="secondary" className="text-[10px]">
              Vercel AI SDK Powered
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs">Document Title</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Master Software Engineer Resume 2026"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Document Type</Label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              >
                <option value="resume">Source Resume</option>
                <option value="cover_letter">Cover Letter Template</option>
                <option value="portfolio">Portfolio / Bio</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Resume Text Content</Label>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste plain resume text here..."
              className="w-full rounded-md border border-input bg-background p-3 text-xs font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsUploading(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isParsing} className="gap-2 text-xs">
              {isParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Save & AI Parse into Profile
            </Button>
          </div>
        </form>
      )}

      {/* Main Grid: Document List & Document Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Document List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter documents..."
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                No documents found. Click "Add / Parse Document" above to save source resumes or cover letters!
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    selectedDoc?.id === doc.id
                      ? "bg-primary/10 border-primary/40 shadow-xs"
                      : "bg-card border-border hover:border-border/80 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <FileText className="size-4 text-emerald-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">{doc.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 font-mono">
                          {doc.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDoc(doc.id);
                    }}
                    className="h-7 w-7 text-rose-400 hover:bg-rose-500/10 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Selected Document Preview & Editor */}
        <div className="lg:col-span-2">
          {selectedDoc ? (
            <div className="p-5 bg-card border border-border rounded-xl space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{selectedDoc.name}</h3>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {selectedDoc.type}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyContent(selectedDoc.content_text)}
                    className="gap-1.5 text-xs h-7"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy Text"}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[480px] p-4 rounded-lg bg-muted/20 border border-border/40 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                {selectedDoc.content_text || "No text content preview available."}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs h-full flex flex-col items-center justify-center gap-2">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
              <span>Select any document on the left to preview or copy its contents.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
