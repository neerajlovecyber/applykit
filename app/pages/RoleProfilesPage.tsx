import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
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
  Calendar,
  Layers,
  Linkedin,
  Clock,
  DollarSign,
  X,
  FileText,
  Mail,
  Phone,
  Globe,
  Building2,
  Ban,
} from "lucide-react";
import type { Profile } from "@/lib/main/db-queries";
import { RoleOnboardingWizard } from "@/app/components/RoleOnboardingWizard";
import { cn } from "@/lib/utils";

export function calculateProfileCompleteness(p: Profile): { score: number; missing: string[] } {
  let score = 0;
  const missing: string[] = [];

  // Basic Contact Info (20%)
  if (p.full_name?.trim()) score += 5; else missing.push("Full Name");
  if (p.email?.trim()) score += 5; else missing.push("Email");
  if (p.phone?.trim()) score += 5; else missing.push("Phone");
  if (p.location?.trim()) score += 5; else missing.push("Location");

  // Web Links (10%)
  if (p.linkedin_url?.trim() || p.portfolio_url?.trim()) score += 10; else missing.push("LinkedIn / Portfolio URL");

  // Summary (15%)
  if (p.summary && p.summary.trim().length > 30) score += 15; else missing.push("Professional Summary");

  // Technical Skills (15%)
  let skillsCount = 0;
  try {
    skillsCount = JSON.parse(p.skills || "[]").length;
  } catch { /* ignore */ }
  if (skillsCount >= 3) score += 15; else if (skillsCount > 0) score += 8; else missing.push("Technical Skills (3+)");

  // Target Titles & Locations (20%)
  let titlesCount = 0;
  try {
    titlesCount = JSON.parse(p.target_titles || "[]").length;
  } catch { /* ignore */ }
  if (titlesCount >= 1) score += 10; else missing.push("Target Job Titles");

  let locsCount = 0;
  try {
    locsCount = JSON.parse(p.target_locations || "[]").length;
  } catch { /* ignore */ }
  if (locsCount >= 1) score += 10; else missing.push("Target Locations");

  // Experience & Preferences (20%)
  if (p.experience_years !== null && p.experience_years >= 0) score += 5; else missing.push("Experience Years");
  if (p.salary_min !== null && p.salary_min > 0) score += 5; else missing.push("Target Salary");
  if (p.notice_period?.trim()) score += 5; else missing.push("Notice Period");
  score += 5; // work_mode present

  return { score: Math.min(100, score), missing };
}

export const RoleProfilesPage: React.FC = () => {
  const conveyor = useConveyor();
  const { profiles, setProfiles, activeProfile, setActiveProfile } = useProfileStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);

  // Form states for active profile editor
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [titlesStr, setTitlesStr] = useState("");
  const [skillsStr, setSkillsStr] = useState("");
  const [locationsStr, setLocationsStr] = useState("");
  const [experienceYears, setExperienceYears] = useState<number>(3);
  const [seniority, setSeniority] = useState("mid");
  const [salaryMin, setSalaryMin] = useState<number>(800000);
  const [salaryCurrency, setSalaryCurrency] = useState("INR");
  const [workMode, setWorkMode] = useState("any");
  const [noticePeriod, setNoticePeriod] = useState("30 days");
  const [visaRequired, setVisaRequired] = useState<boolean>(false);
  const [excludeCompaniesStr, setExcludeCompaniesStr] = useState("");
  const [excludeKeywordsStr, setExcludeKeywordsStr] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (activeProfile) {
      populateFormFields(activeProfile);
    }
  }, [activeProfile]);

  const loadProfiles = async () => {
    try {
      const list = await conveyor.data.getProfiles();
      setProfiles(list);
      const active = list.find((p) => p.is_active === 1) || list[0] || null;
      if (active) {
        setActiveProfile(active);
        populateFormFields(active);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  };

  const populateFormFields = (p: Profile) => {
    setFullName(p.full_name || p.name || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setLocation(p.location || "");
    setLinkedinUrl(p.linkedin_url || "");
    setPortfolioUrl(p.portfolio_url || "");
    setSummary(p.summary || "");
    setTitlesStr(parseJsonArray(p.target_titles).join(", "));
    setSkillsStr(parseJsonArray(p.skills).join(", "));
    setLocationsStr(parseJsonArray(p.target_locations).join(", "));
    setExperienceYears(p.experience_years ?? 3);
    setSeniority(p.seniority || "mid");
    setSalaryMin(p.salary_min || 800000);
    setSalaryCurrency(p.salary_currency || "INR");
    setWorkMode(p.work_mode || "any");
    setNoticePeriod(p.notice_period || "30 days");
    setVisaRequired(p.visa_required === 1);
    setExcludeCompaniesStr(parseJsonArray(p.exclude_companies).join(", "));
    setExcludeKeywordsStr(parseJsonArray(p.exclude_keywords).join(", "));
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
    if (!activeProfile) return;

    const payload: Partial<Profile> = {
      name: fullName || activeProfile.name || "Candidate Profile",
      full_name: fullName,
      email,
      phone,
      location,
      linkedin_url: linkedinUrl,
      portfolio_url: portfolioUrl,
      summary,
      target_titles: stringToJsonArray(titlesStr),
      skills: stringToJsonArray(skillsStr),
      target_locations: stringToJsonArray(locationsStr),
      experience_years: experienceYears,
      seniority,
      salary_min: salaryMin || 800000,
      salary_currency: salaryCurrency,
      work_mode: workMode,
      notice_period: noticePeriod,
      visa_required: visaRequired ? 1 : 0,
      exclude_companies: stringToJsonArray(excludeCompaniesStr),
      exclude_keywords: stringToJsonArray(excludeKeywordsStr),
    };

    await conveyor.data.updateProfile(activeProfile.id, payload);
    setIsEditing(false);
    loadProfiles();
  };

  const currentProfile = activeProfile || profiles[0] || null;
  const { score, missing } = currentProfile
    ? calculateProfileCompleteness(currentProfile)
    : { score: 0, missing: [] };

  const titles = currentProfile ? parseJsonArray(currentProfile.target_titles) : [];
  const skills = currentProfile ? parseJsonArray(currentProfile.skills) : [];
  const locations = currentProfile ? parseJsonArray(currentProfile.target_locations) : [];
  const excludeCompanies = currentProfile ? parseJsonArray(currentProfile.exclude_companies) : [];
  const excludeKeywords = currentProfile ? parseJsonArray(currentProfile.exclude_keywords) : [];
  const formattedSalary = currentProfile?.salary_min ? currentProfile.salary_min.toLocaleString() : "800,000";

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Role Onboarding Wizard Modal */}
      <RoleOnboardingWizard isOpen={showWizardModal} onClose={() => { setShowWizardModal(false); loadProfiles(); }} />

      {/* Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-6 w-6 text-primary" /> My Profile
          </h2>
          <p className="text-sm text-muted-foreground">Candidate details, resume evidence, and target role preferences</p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setShowWizardModal(true)} variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
            <Sparkles className="h-4 w-4 text-emerald-400" /> AI Update from Resume
          </Button>

          {isEditing ? (
            <Button size="sm" onClick={handleSaveProfile} className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
              <Save className="h-4 w-4" /> Save Profile
            </Button>
          ) : (
            <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 text-xs font-semibold">
              <Edit2 className="h-4 w-4" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

      {!currentProfile ? (
        <div className="p-8 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card text-center space-y-4 shadow-xl">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto text-primary p-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">No Candidate Profile Setup Yet</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-1">
              Create your candidate profile using AI Resume Import or paste your resume text to start auto-applying!
            </p>
          </div>
          <Button size="lg" onClick={() => setShowWizardModal(true)} className="gap-2 font-semibold">
            <Sparkles className="h-4 w-4" /> Import Candidate Resume with AI
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Completeness Score Card */}
          <div className="p-4 rounded-2xl border border-border bg-card/90 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-400" /> Profile Match Readiness
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{score}% Complete</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-sky-500" : "bg-amber-500"
                )}
                style={{ width: `${score}%` }}
              />
            </div>

            {missing.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 pt-1 text-[11px]">
                <span className="text-muted-foreground font-medium">Suggestions to improve form filler accuracy:</span>
                {missing.map((m) => (
                  <Badge
                    key={m}
                    variant="outline"
                    className="text-[10px] py-0.5 px-2 cursor-pointer hover:bg-emerald-500/20"
                    onClick={() => setIsEditing(true)}
                  >
                    + Add {m}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Editor Mode vs Overview View */}
          {isEditing ? (
            <div className="p-6 rounded-2xl border border-emerald-500/40 bg-card shadow-xl space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-lg text-foreground">Edit Candidate Profile</h3>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </div>

              {/* Section 1: Contact Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Personal & Contact Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Full Candidate Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Doe" className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email Address</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Phone Number</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 019-2834" className="text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Current Location</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Gurugram, India / Remote" className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">LinkedIn Profile URL</Label>
                    <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username" className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Portfolio / Website URL</Label>
                    <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://myportfolio.com" className="text-xs" />
                  </div>
                </div>
              </div>

              {/* Section 2: Preferences */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary" /> Target Roles & Preferences
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Target Job Titles (comma separated)</Label>
                    <Input value={titlesStr} onChange={(e) => setTitlesStr(e.target.value)} placeholder="DevOps Engineer, SRE, Cloud Engineer" className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Preferred Locations (comma separated)</Label>
                    <Input value={locationsStr} onChange={(e) => setLocationsStr(e.target.value)} placeholder="Gurugram, Remote, Bangalore" className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Work Mode</Label>
                    <Select value={workMode} onValueChange={setWorkMode}>
                      <SelectTrigger className="text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Work Mode</SelectItem>
                        <SelectItem value="remote">Remote Only</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onSite">On-site / Office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Years of Experience</Label>
                    <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(Number(e.target.value))} className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Seniority Level</Label>
                    <Select value={seniority} onValueChange={setSeniority}>
                      <SelectTrigger className="text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">Junior (0-2 yrs)</SelectItem>
                        <SelectItem value="mid">Mid-Level (3-5 yrs)</SelectItem>
                        <SelectItem value="senior">Senior (5-8 yrs)</SelectItem>
                        <SelectItem value="lead">Lead / Principal (8+ yrs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Notice Period</Label>
                    <Select value={noticePeriod} onValueChange={setNoticePeriod}>
                      <SelectTrigger className="text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Immediate">⚡ Immediate Joiner</SelectItem>
                        <SelectItem value="15 days">15 Days</SelectItem>
                        <SelectItem value="30 days">30 Days</SelectItem>
                        <SelectItem value="60 days">60 Days</SelectItem>
                        <SelectItem value="90 days">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Currency</Label>
                    <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                      <SelectTrigger className="text-xs w-full font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
                        <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                        <SelectItem value="EUR">€ EUR (Euro)</SelectItem>
                        <SelectItem value="GBP">£ GBP (British Pound)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Min Expected Salary ({salaryCurrency})</Label>
                    <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(Number(e.target.value))} placeholder="800000" className="text-xs font-mono" />
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div className="flex items-center gap-2 pt-2">
                      <Switch id="visa-toggle" checked={visaRequired} onCheckedChange={setVisaRequired} />
                      <Label htmlFor="visa-toggle" className="text-xs font-semibold cursor-pointer">
                        Require Visa Sponsorship for Employment
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Skills & Exclusions */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Technical Skills & Filter Exclusions
                </h4>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Key Technical Skills & Tools (comma separated)</Label>
                  <Input value={skillsStr} onChange={(e) => setSkillsStr(e.target.value)} placeholder="AWS, Docker, Kubernetes, Terraform, Python, CI/CD" className="text-xs font-mono" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Exclude Companies (comma separated)</Label>
                    <Input value={excludeCompaniesStr} onChange={(e) => setExcludeCompaniesStr(e.target.value)} placeholder="e.g. Revature, Consulting Co" className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Exclude Keywords (comma separated)</Label>
                    <Input value={excludeKeywordsStr} onChange={(e) => setExcludeKeywordsStr(e.target.value)} placeholder="e.g. unpaid, contract, 100% travel" className="text-xs" />
                  </div>
                </div>
              </div>

              {/* Section 4: Master Summary */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs font-semibold">Full Master Resume & Work History Evidence Text</Label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Paste full master resume text, projects, work experience, achievements, and education details..."
                  rows={6}
                  className="w-full rounded-md border border-input bg-background p-3 text-xs shadow-xs font-mono leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button size="sm" onClick={handleSaveProfile} className="gap-2 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Save className="h-4 w-4" /> Save Profile
                </Button>
              </div>
            </div>
          ) : (
            /* Overview View Card */
            <div className="p-6 rounded-2xl border border-border bg-card space-y-6 shadow-md">
              {/* Personal Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl shrink-0">
                    <User className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-xl text-foreground">{currentProfile.full_name || currentProfile.name}</h3>
                      {currentProfile.location && <Badge variant="secondary" className="text-xs">{currentProfile.location}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-4 mt-1.5 font-medium">
                      {currentProfile.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-primary" /> {currentProfile.email}</span>}
                      {currentProfile.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-primary" /> {currentProfile.phone}</span>}
                      {currentProfile.notice_period && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-emerald-400" /> Notice: {currentProfile.notice_period}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 text-xs font-semibold">
                    <Edit2 className="h-3.5 w-3.5" /> Edit Profile
                  </Button>
                </div>
              </div>

              {/* Master Technical Skills Badges */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Technical Skills & Core Tools ({skills.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skills.length > 0 ? (
                    skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="font-mono text-xs py-1 px-2.5 bg-muted/60">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No skills listed yet</span>
                  )}
                </div>
              </div>

              {/* Preferences & Target Role Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-muted/20 border border-border/60 text-xs">
                <div className="space-y-1">
                  <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-primary" /> Target Job Titles
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {titles.length > 0 ? (
                      titles.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Not specified</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Experience & Level
                  </div>
                  <div className="font-medium text-foreground text-xs pt-0.5">
                    {currentProfile.experience_years ?? 3} Years ({currentProfile.seniority || "Mid-Level"})
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-primary" /> Expected Min Salary
                  </div>
                  <div className="font-medium text-emerald-400 text-xs pt-0.5 font-mono">
                    {currentProfile.salary_currency || "INR"} {formattedSalary} / year
                  </div>
                </div>
              </div>

              {/* Exclusions & Work Auth (if set) */}
              {(excludeCompanies.length > 0 || excludeKeywords.length > 0 || currentProfile.visa_required === 1) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
                  {excludeCompanies.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-rose-400" /> Excluded Companies
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {excludeCompanies.map((c, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[11px]">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {excludeKeywords.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Ban className="h-3.5 w-3.5 text-amber-400" /> Excluded Keywords
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {excludeKeywords.map((k, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[11px]">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentProfile.visa_required === 1 && (
                    <div className="space-y-1">
                      <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-sky-400" /> Visa Sponsorship
                      </div>
                      <span className="text-sky-400 font-semibold text-[11px]">Requires Visa Sponsorship</span>
                    </div>
                  )}
                </div>
              )}

              {/* Full Master Resume & Work History Evidence */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Master Resume & Work History Evidence
                  </span>
                  <button onClick={() => setIsEditing(true)} className="text-[11px] text-primary hover:underline font-medium">
                    Edit Text
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto font-mono">
                  {currentProfile.summary || "No master summary added yet. Click 'Edit Profile' to paste your resume text."}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
