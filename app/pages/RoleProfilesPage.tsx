import React, { useState, useEffect } from "react";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  Plus,
  Trash2,
  Sparkles,
  Save,
  CheckCircle2,
  Edit2,
  User,
  Target,
  Briefcase,
  MapPin,
  IndianRupee,
  Calendar,
  Layers,
} from "lucide-react";
import type { Profile } from "@/lib/main/db-queries";
import { RoleOnboardingWizard } from "@/app/components/RoleOnboardingWizard";
import { ResumeParsedView } from "@/app/components/ResumeParsedView";

export const RoleProfilesPage: React.FC = () => {
  const conveyor = useConveyor();
  const { profiles, setProfiles, activeProfile, setActiveProfile } = useProfileStore();

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);

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
  const [salaryMin, setSalaryMin] = useState<number>(800000);
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
    setSalaryMin(p.salary_min || 800000);
    setWorkMode(p.work_mode || "any");
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
      name: name || "DevSecOps & Security Profile",
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
      salary_min: salaryMin || 800000,
      salary_currency: "INR",
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
      {/* Role Onboarding Wizard Modal */}
      <RoleOnboardingWizard isOpen={showWizardModal} onClose={() => { setShowWizardModal(false); loadProfiles(); }} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Candidate Profiles & Full Evidence Pool</h2>
          <p className="text-sm text-muted-foreground">View complete candidate details, work experience, skills & target job roles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowWizardModal(true)} className="gap-2 text-xs font-semibold">
            <Plus className="h-4 w-4" /> Add Role Track / Profile
          </Button>
        </div>
      </div>

      {/* Empty State Banner */}
      {profiles.length === 0 && !isCreating && !editingProfile && (
        <div className="p-8 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card text-center space-y-4 shadow-xl">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto text-primary p-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">No Candidate Profiles Configured Yet</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-1">
              Create your candidate profile using the 3-step AI onboarding wizard. Paste your resume text to extract full experience, contact info & target role tracks in seconds!
            </p>
          </div>
          <Button size="lg" onClick={() => setShowWizardModal(true)} className="gap-2 font-semibold">
            <Sparkles className="h-4 w-4" /> Start Profile Onboarding Wizard
          </Button>
        </div>
      )}

      {/* Profile Form Editor (Create or Edit) */}
      {(editingProfile || isCreating) && (
        <div className="p-6 rounded-2xl border border-primary/40 bg-card shadow-lg space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-lg">
                {isCreating ? "New Candidate Profile Track" : `Edit Profile: ${editingProfile?.name}`}
              </h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setEditingProfile(null); setIsCreating(false); }}>
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Profile Track Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DevSecOps & Security Track" className="text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Full Candidate Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Phone Number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" className="text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Current Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bangalore, India / Remote" className="text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Target Job Titles (comma separated)</Label>
              <Input value={titlesStr} onChange={(e) => setTitlesStr(e.target.value)} placeholder="DevSecOps Engineer, Penetration Tester" className="text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Key Technical Skills & Tools</Label>
              <Input value={skillsStr} onChange={(e) => setSkillsStr(e.target.value)} placeholder="Burp Suite, Metasploit, DevSecOps, Kubernetes, Docker, Python" className="text-xs font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Preferred Job Locations</Label>
              <Input value={locationsStr} onChange={(e) => setLocationsStr(e.target.value)} placeholder="Remote, Bangalore, India" className="text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold font-mono">Min Salary (₹ INR / year)</Label>
              <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(Number(e.target.value))} placeholder="800000" className="text-xs font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Total Experience (Years)</Label>
              <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(Number(e.target.value))} className="text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Seniority Level</Label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
              >
                <option value="junior">Junior (0-2 yrs)</option>
                <option value="mid">Mid-Level (3-5 yrs)</option>
                <option value="senior">Senior (5-8 yrs)</option>
                <option value="lead">Lead / Principal (8+ yrs)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Full Professional Summary & Work Experience</Label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Detailed overview of technical achievements, work experience, certifications, penetration test reports, and cloud security projects..."
              rows={5}
              className="w-full rounded-md border border-input bg-background p-3 text-xs shadow-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" onClick={handleSaveProfile} className="gap-2 font-semibold">
              <Save className="h-4 w-4" /> Save Profile Details
            </Button>
          </div>
        </div>
      )}

      {/* Profiles Cards List with Full Candidate Evidence Details */}
      <div className="space-y-6">
        {profiles.map((profile) => {
          const isActive = profile.is_active === 1;
          const titles = parseJsonArray(profile.target_titles);
          const skills = parseJsonArray(profile.skills);
          const locations = parseJsonArray(profile.target_locations);
          const formattedSalary = (profile.salary_min || 800000).toLocaleString("en-IN");

          return (
            <div
              key={profile.id}
              className={`p-6 rounded-2xl border bg-card/90 space-y-5 transition-all shadow-md ${
                isActive ? "border-primary shadow-lg ring-1 ring-primary/20" : "border-border hover:border-border/80"
              }`}
            >
              {/* Profile Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div className="flex items-start gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg text-foreground">{profile.name}</h3>
                      {isActive ? (
                        <Badge variant="default" className="bg-emerald-500 text-xs">Active Profile Track</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive Track</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 mt-1 font-medium">
                      {profile.full_name && <span className="text-foreground font-semibold">👤 {profile.full_name}</span>}
                      {profile.email && <span>📧 {profile.email}</span>}
                      {profile.phone && <span>📱 {profile.phone}</span>}
                      {profile.location && <span>📍 {profile.location}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isActive && (
                    <Button size="sm" variant="outline" onClick={() => handleSetActive(profile.id)} className="gap-1.5 text-xs font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Set Active
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleStartEdit(profile)} className="gap-1.5 text-xs">
                    <Edit2 className="h-3.5 w-3.5" /> Edit Profile
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDeleteProfile(profile.id)} className="h-8 w-8 text-rose-400 hover:bg-rose-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Candidate Work Experience & Professional Summary */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Full Professional Summary & Work History
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto font-mono">
                  {profile.summary || "No master summary added yet. Click 'Edit Profile' to add your full work experience."}
                </div>
              </div>

              {/* Master Technical Skills */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Technical Skills & Toolsets ({skills.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skills.length > 0 ? (
                    skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="font-mono text-xs py-1 px-2.5 bg-muted/60">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No skills listed</span>
                  )}
                </div>
              </div>

              {/* Target Job Titles & Preferences Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border/40 text-xs">
                <div className="space-y-1">
                  <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-primary" /> Target Job Titles
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {titles.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Experience & Level
                  </div>
                  <div className="font-medium text-foreground text-xs pt-0.5">
                    {profile.experience_years ?? 3} Years ({profile.seniority || "Mid-Level"})
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-primary" /> Min Expected Salary
                  </div>
                  <div className="font-medium text-emerald-400 text-xs pt-0.5 font-mono">
                    ₹{formattedSalary} / year ({profile.salary_min ? `${(profile.salary_min / 100000).toFixed(1)} LPA` : "8 LPA"})
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
