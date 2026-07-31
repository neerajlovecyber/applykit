import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { Plus, Upload, Check, Trash2, FileText, Briefcase, MapPin, DollarSign } from "lucide-react";

interface ProfileItem {
  id: string;
  name: string;
  resumeName: string;
  titles: string[];
  locations: string[];
  workMode: string;
  salaryMin: string;
  isActive: boolean;
}

export const RoleProfilesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<ProfileItem[]>([
    {
      id: "1",
      name: "Frontend Engineer",
      resumeName: "resume_frontend_2026.pdf",
      titles: ["Frontend Engineer", "React Developer", "UI Architect"],
      locations: ["Remote", "San Francisco, CA"],
      workMode: "Remote / Hybrid",
      salaryMin: "$140,000",
      isActive: true,
    },
    {
      id: "2",
      name: "Full Stack Engineer",
      resumeName: "resume_fullstack_2026.pdf",
      titles: ["Full Stack Engineer", "Node.js Developer"],
      locations: ["Remote"],
      workMode: "Remote Only",
      salaryMin: "$150,000",
      isActive: false,
    },
  ]);

  const handleSetActive = (id: string) => {
    setProfiles(profiles.map((p) => ({ ...p, isActive: p.id === id })));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Role Profiles</h2>
          <p className="text-sm text-muted-foreground">Each profile bundles a targeted resume with specific job preferences</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Profile
        </Button>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`p-6 rounded-2xl border bg-card space-y-5 relative transition-all ${
              profile.isActive ? "border-primary shadow-sm ring-1 ring-primary/20" : "border-border hover:border-border/80"
            }`}
          >
            {/* Title & Active Status */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{profile.name}</h3>
                  {profile.isActive && <Badge variant="default" className="bg-emerald-500">Active Profile</Badge>}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <FileText className="h-3.5 w-3.5" /> {profile.resumeName}
                </div>
              </div>

              {!profile.isActive && (
                <Button size="sm" variant="outline" onClick={() => handleSetActive(profile.id)}>
                  Set Active
                </Button>
              )}
            </div>

            {/* Profile Preferences Summary */}
            <div className="space-y-3 pt-2 text-xs border-t border-border/40">
              <div>
                <div className="text-muted-foreground mb-1.5 font-medium">Target Titles</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.titles.map((t, idx) => (
                    <Badge key={idx} variant="secondary" className="font-normal">{t}</Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <div className="text-muted-foreground font-medium">Preferred Locations</div>
                  <div className="font-medium text-foreground mt-0.5">{profile.locations.join(", ")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground font-medium">Min Salary</div>
                  <div className="font-medium text-foreground mt-0.5">{profile.salaryMin}</div>
                </div>
              </div>
            </div>

            {/* Resume Upload Dropzone */}
            <div className="border border-dashed border-border rounded-xl p-4 text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
              <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-xs font-medium">Upload new resume (PDF)</div>
              <div className="text-[10px] text-muted-foreground">Replaces current resume for this profile</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
