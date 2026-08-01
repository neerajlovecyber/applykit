import React, { useState, useEffect } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  Plus,
  Upload,
  Check,
  Trash2,
  FileText,
  Briefcase,
  MapPin,
  DollarSign,
  Edit2,
  Sparkles,
  Save,
} from "lucide-react";
import type { Profile } from "@/lib/main/db-queries";

export const RoleProfilesPage: React.FC = () => {
  const conveyor = useConveyor();
  const { profiles, setProfiles, activeProfile, setActiveProfile } = useProfileStore();

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form states for editor
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [titlesStr, setTitlesStr] = useState("");
  const [skillsStr, setSkillsStr] = useState("");
  const [locationsStr, setLocationsStr] = useState("");
  const [experienceYears, setExperienceYears] = useState<number>(3);
  const [seniority, setSeniority] = useState("mid");
  const [salaryMin, setSalaryMin] = useState<number>(100000);
  const [workMode, setWorkMode] = useState("any");

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const list = await conveyor.data.getProfiles();
      setProfiles(list);
      const active = list.find((p) => p.is_active === 1) || list[0] || null;
      if (active) setActiveProfile(active);
    } catch (err) {
      console.error("Failed to load profiles:", err);
    }
  };

  const handleSetActive = async (id: string) => {
    await conveyor.data.setActiveProfile(id);
    loadProfiles();
  };

  const handleStartEdit = (p: Profile) => {
    setEditingProfile(p);
    setIsCreating(false);
    setName(p.name);
    setFullName(p.full_name || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setLocation(p.location || "");
    setSummary(p.summary || "");
    setTitlesStr(parseJsonArray(p.target_titles).join(", "));
    setSkillsStr(parseJsonArray(p.skills).join(", "));
    setLocationsStr(parseJsonArray(p.target_locations).join(", "));
    setExperienceYears(p.experience_years || 3);
    setSeniority(p.seniority || "mid");
    setSalaryMin(p.salary_min || 100000);
    setWorkMode(p.work_mode || "any");
  };

  const handleStartCreate = () => {
    setEditingProfile(null);
    setIsCreating(true);
    setName("Software Engineer");
    setFullName("");
    setEmail("");
    setPhone("");
    setLocation("");
    setSummary("");
    setTitlesStr("Frontend Engineer, React Developer");
    setSkillsStr("React, TypeScript, Node.js, TailwindCSS");
    setLocationsStr("Remote, Bangalore");
    setExperienceYears(4);
    setSeniority("mid");
    setSalaryMin(1200000);
    setWorkMode("any");
  };

  const parseJsonArray = (jsonStr: string): string[] => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  };

  const stringToJsonArray = (str: string): string => {
    const arr = str.split(",").map((s) => s.trim()).filter(Boolean);
    return JSON.stringify(arr);
  };

  const handleSaveProfile = async () => {
    const payload: Partial<Profile> = {
      name,
      full_name: fullName,
      email,
      phone,
      location,
      summary,
      target_titles: stringToJsonArray(titlesStr),
      skills: stringToJsonArray(skillsStr),
      target_locations: stringToJsonArray(locationsStr),
      experience_years: experienceYears,
      seniority,
      salary_min: salaryMin,
      work_mode: workMode,
    };

    if (isCreating) {
      await conveyor.data.createProfile(payload);
    } else if (editingProfile) {
      await conveyor.data.updateProfile(editingProfile.id, payload);
    }

    setEditingProfile(null);
    setIsCreating(false);
    loadProfiles();
  };

  const handleDeleteProfile = async (id: string) => {
    if (confirm("Are you sure you want to delete this profile?")) {
      await conveyor.data.deleteProfile(id);
      loadProfiles();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Applicant Profiles</h2>
          <p className="text-sm text-muted-foreground">Manage profile evidence pools, targeted titles, and job preferences</p>
        </div>
        <Button onClick={handleStartCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Create Profile
        </Button>
      </div>

      {/* Editor Drawer / Modal inline */}
      {(editingProfile || isCreating) && (
        <div className="p-6 rounded-2xl border border-primary/40 bg-card shadow-lg space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-lg">
                {isCreating ? "New Role Profile" : `Edit Profile: ${editingProfile?.name}`}
              </h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setEditingProfile(null); setIsCreating(false); }}>
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Profile Preset Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior React Developer" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Target Job Titles (comma separated)</Label>
              <Input value={titlesStr} onChange={(e) => setTitlesStr(e.target.value)} placeholder="Frontend Engineer, React Lead" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Skills (comma separated)</Label>
              <Input value={skillsStr} onChange={(e) => setSkillsStr(e.target.value)} placeholder="React, TypeScript, Next.js, Node.js" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Preferred Locations (comma separated)</Label>
              <Input value={locationsStr} onChange={(e) => setLocationsStr(e.target.value)} placeholder="Remote, Bangalore, Mumbai" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Years of Experience</Label>
              <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Seniority Level</Label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              >
                <option value="junior">Junior</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Principal</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Minimum Expected Salary</Label>
              <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Professional Summary / AI Background</Label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Detailed overview of your technical achievements, background, and career highlights..."
              rows={4}
              className="w-full rounded-md border border-input bg-background p-3 text-xs shadow-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" onClick={handleSaveProfile} className="gap-2">
              <Save className="h-4 w-4" /> Save Profile
            </Button>
          </div>
        </div>
      )}

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {profiles.map((profile) => {
          const isActive = profile.is_active === 1;
          const titles = parseJsonArray(profile.target_titles);
          const skills = parseJsonArray(profile.skills);
          const locations = parseJsonArray(profile.target_locations);

          return (
            <div
              key={profile.id}
              className={`p-6 rounded-2xl border bg-card space-y-5 relative transition-all ${
                isActive ? "border-primary shadow-md ring-1 ring-primary/20" : "border-border hover:border-border/80"
              }`}
            >
              {/* Title & Active Status */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{profile.name}</h3>
                    {isActive && <Badge variant="default" className="bg-emerald-500 text-xs">Active Profile</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <FileText className="h-3.5 w-3.5" /> {profile.resume_path || "No resume uploaded"}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(profile)}>
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400" onClick={() => handleDeleteProfile(profile.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  {!isActive && (
                    <Button size="sm" variant="outline" onClick={() => handleSetActive(profile.id)}>
                      Set Active
                    </Button>
                  )}
                </div>
              </div>

              {/* Profile Details */}
              <div className="space-y-3 pt-2 text-xs border-t border-border/40">
                <div>
                  <div className="text-muted-foreground mb-1 font-medium">Target Titles</div>
                  <div className="flex flex-wrap gap-1.5">
                    {titles.length > 0 ? (
                      titles.map((t, idx) => (
                        <Badge key={idx} variant="secondary" className="font-normal">{t}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">None specified</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1 font-medium">Key Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {skills.slice(0, 6).map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-muted/60 text-[11px] font-mono">
                        {s}
                      </span>
                    ))}
                    {skills.length > 6 && (
                      <span className="text-[10px] text-muted-foreground self-center">+{skills.length - 6} more</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/20">
                  <div>
                    <div className="text-muted-foreground font-medium">Experience</div>
                    <div className="font-medium text-foreground mt-0.5">{profile.experience_years ?? 0} Years ({profile.seniority})</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium">Locations</div>
                    <div className="font-medium text-foreground mt-0.5">{locations.join(", ") || "Any"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-medium">Min Salary</div>
                    <div className="font-medium text-foreground mt-0.5">{profile.salary_min ? `${profile.salary_min}` : "Flex"}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
