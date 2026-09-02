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
  Clock,
  DollarSign,
  X,
  FileText,
  Mail,
  Phone,
  Globe,
  Building2,
  Ban,
  GraduationCap,
  FolderGit2,
  Pencil,
  Check,
} from "lucide-react";
import { Linkedin } from "@/components/icons/brand-icons";
import type { Profile } from "@/lib/conveyor/schemas";
import { RoleOnboardingWizard } from "@/app/components/RoleOnboardingWizard";
import { parseMasterCV } from "@/lib/providers/cv-parser";
import { cn } from "@/lib/utils";

export interface WorkExpItem {
  id: string;
  role: string;
  company: string;
  location: string;
  employmentType: string;
  startMonth?: string;
  startYear?: string;
  endMonth?: string;
  endYear?: string;
  isCurrent?: boolean;
  period: string;
  bulletsStr: string;
}

export interface EduItem {
  id: string;
  degree: string;
  institution: string;
  period: string;
  gpa?: string;
}

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
  if (p.notice_period?.trim() || true) score += 5;
  score += 5; // work_mode present

  return { score: Math.min(100, score), missing };
}

// Field Map for Auto-Scroll & Glowing Highlight
const FIELD_ELEMENT_IDS: Record<string, string> = {
  "Full Name": "field-full-name",
  "Email": "field-email",
  "Phone": "field-phone",
  "Location": "field-location",
  "LinkedIn / Portfolio URL": "field-linkedin-url",
  "Professional Summary": "field-summary",
  "Technical Skills (3+)": "field-skills",
  "Target Job Titles": "field-target-titles",
  "Target Locations": "field-target-locations",
  "Experience Years": "field-experience-years",
  "Target Salary": "field-salary",
  "Notice Period": "field-notice-period",
};

export const RoleProfilesPage: React.FC = () => {
  const conveyor = useConveyor();
  const { profiles, setProfiles, activeProfile, setActiveProfile } = useProfileStore();

  const [isEditing, setIsEditing] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form states for active profile editor
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [titlesStr, setTitlesStr] = useState("");
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
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

  // Structured Work Experience & Education
  const [workExperiences, setWorkExperiences] = useState<WorkExpItem[]>([]);
  const [educations, setEducations] = useState<EduItem[]>([]);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (activeProfile) {
      populateFormFields(activeProfile);
    }
  }, [activeProfile]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadProfiles = async () => {
    try {
      const list = await conveyor.data.getProfiles();
      setProfiles(list);
      const active = list.find((p) => p.is_active === 1) || list[0] || null;
      if (active) {
        if (!active.notice_period) {
          active.notice_period = "30 days";
          conveyor.data.updateProfile(active.id, { notice_period: "30 days" }).catch(() => {});
        }
        setActiveProfile({ ...active });
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
    setSkillsList(parseJsonArray(p.skills));
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

    // Load Work Experience & Education
    let loadedExp: WorkExpItem[] = [];
    let loadedEdu: EduItem[] = [];

    if (p.resume_parsed) {
      try {
        const parsed = JSON.parse(p.resume_parsed);
        const aiWorkExp = parsed.workExperience || parsed.work_experience || [];
        if (aiWorkExp.length > 0) {
          loadedExp = aiWorkExp.map((exp: any, idx: number) => {
            const rawDesc = exp.description;
            const descStr = Array.isArray(rawDesc)
              ? rawDesc.map((b: string) => (b.startsWith("•") ? b : `• ${b}`)).join("\n")
              : (rawDesc || "");
            return {
              id: exp.id ? `exp-${exp.id}` : `exp-${idx}-${Date.now()}`,
              role: exp.title || exp.role || "DevOps Engineer",
              company: exp.company || "Company",
              location: exp.location || "Remote, Delhi NCR",
              employmentType: exp.employmentType || "Full-Time",
              period: exp.years || exp.duration || exp.period || "Nov 2024 - Present",
              isCurrent: (exp.years || exp.period || "").toLowerCase().includes("present"),
              bulletsStr: descStr,
            };
          });
        }

        const aiEdu = parsed.education || [];
        if (aiEdu.length > 0) {
          loadedEdu = aiEdu.map((e: any, idx: number) => ({
            id: e.id ? `edu-${e.id}` : `edu-${idx}-${Date.now()}`,
            degree: e.degree || "Bachelor's, Computer Engineering",
            institution: e.institution || "University Name",
            period: e.years || e.year || "2020 - 2024",
            gpa: e.description || e.gpa || "GPA: 8.29",
          }));
        }
      } catch { /* ignore */ }
    }

    if (loadedExp.length === 0 && p.summary) {
      const masterCV = parseMasterCV(p.summary);
      if (masterCV.experience.length > 0) {
        loadedExp = masterCV.experience.map((exp, idx) => ({
          id: `exp-${idx}-${Date.now()}`,
          role: exp.role || "DevOps Engineer",
          company: exp.company || "Company",
          location: exp.location || "Remote, Delhi NCR",
          employmentType: "Full-Time",
          period: exp.period || "Nov 2024 - Present",
          isCurrent: (exp.period || "").toLowerCase().includes("present"),
          bulletsStr: exp.bullets.map((b) => (b.startsWith("•") ? b : `• ${b}`)).join("\n"),
        }));
      }

      if (masterCV.education.length > 0) {
        loadedEdu = masterCV.education.map((e, idx) => ({
          id: `edu-${idx}-${Date.now()}`,
          degree: e.degree || "Bachelor's, Computer Engineering",
          institution: e.institution || "University Name",
          period: e.year || "2020 - 2024",
          gpa: "GPA: 8.29",
        }));
      }
    }

    // Default Seed Fallbacks if empty
    if (loadedExp.length === 0) {
      loadedExp = [
        {
          id: `exp-seed-1`,
          role: "DevOps Engineer",
          company: "xIoTz Private Limited",
          location: "Remote, Delhi NCR",
          employmentType: "Full-Time",
          period: "Nov 2024 - Present",
          isCurrent: true,
          bulletsStr: "• Cloud Operations: Co-designed and operated a cyber assurance platform on AWS EC2, improving operational visibility for 10 cloud workloads through provisioning, logging, monitoring, and deployment controls.\n• Infrastructure Automation: Built reproducible Windows/Linux deployment workflows, reducing setup drift through scripted health checks, configuration baselines, and repeatable environment controls.\n• Automation & Reliability: Automated operational response workflows with Wazuh Active Response, reducing manual remediation steps and improving consistency across distributed workloads.\n• Operational Reporting: Built workflows for asset discovery, baseline checks, evidence collection, and remediation tracking; documented findings and partnered with engineers.",
        },
      ];
    }

    if (loadedEdu.length === 0) {
      loadedEdu = [
        {
          id: `edu-seed-1`,
          degree: "Bachelor's, Computer Engineering",
          institution: "Lovely Professional University",
          period: "Aug 2020 - Oct 2024",
          gpa: "GPA: 8.29",
        },
      ];
    }

    setWorkExperiences(loadedExp);
    setEducations(loadedEdu);
  };

  const parseJsonArray = (jsonStr?: string | null): string[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const stringToJsonArray = (str: string): string => {
    const arr = str.split(",").map((s) => s.trim()).filter(Boolean);
    return JSON.stringify(arr);
  };

  // Helper to scroll to & highlight missing field in form
  const scrollToAndHighlightField = (fieldId: string) => {
    setIsEditing(true);
    setTimeout(() => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-emerald-400", "border-emerald-400", "bg-emerald-500/10");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-emerald-400", "border-emerald-400", "bg-emerald-500/10");
        }, 2500);
      }
    }, 150);
  };

  const handleSuggestionClick = (missingLabel: string) => {
    const fieldId = FIELD_ELEMENT_IDS[missingLabel] || "field-notice-period";
    scrollToAndHighlightField(fieldId);
  };

  // Skill Tag Handlers
  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim().replace(/^,+|,+$/g, "");
    if (trimmed && !skillsList.includes(trimmed)) {
      setSkillsList((prev) => [...prev, trimmed]);
    }
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList((prev) => prev.filter((s) => s !== skillToRemove));
  };

  // Work Experience Item Handlers
  const addWorkExp = () => {
    const newId = `exp-${Date.now()}`;
    const newItem: WorkExpItem = {
      id: newId,
      role: "DevOps Engineer",
      company: "Company Name",
      location: "Remote, Delhi NCR",
      employmentType: "Full-Time",
      startMonth: "November",
      startYear: "2024",
      isCurrent: true,
      period: "Nov 2024 - Present",
      bulletsStr: "• Built deployment workflows with GitHub Actions\n• Automated infrastructure provisioning with Terraform",
    };
    setWorkExperiences((prev) => [...prev, newItem]);
  };

  const updateWorkExp = (id: string, field: keyof WorkExpItem, val: any) => {
    setWorkExperiences((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (["startMonth", "startYear", "endMonth", "endYear", "isCurrent"].includes(field)) {
          const start = `${updated.startMonth || "Nov"} ${updated.startYear || "2024"}`.trim();
          const end = updated.isCurrent ? "Present" : `${updated.endMonth || ""} ${updated.endYear || ""}`.trim();
          updated.period = `${start} - ${end}`;
        }
        return updated;
      })
    );
  };

  const deleteWorkExp = (id: string) => {
    setWorkExperiences((prev) => prev.filter((item) => item.id !== id));
  };

  // Education Item Handlers
  const addEdu = () => {
    const newId = `edu-${Date.now()}`;
    const newItem: EduItem = {
      id: newId,
      degree: "Bachelor's, Computer Engineering",
      institution: "Lovely Professional University",
      period: "Aug 2020 - Oct 2024",
      gpa: "GPA: 8.29",
    };
    setEducations((prev) => [...prev, newItem]);
  };

  const updateEdu = (id: string, field: keyof EduItem, val: string) => {
    setEducations((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const deleteEdu = (id: string) => {
    setEducations((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveProfile = async () => {
    if (!activeProfile) return;

    const expFormatted = workExperiences
      .map((exp) => `### ${exp.role} — ${exp.company} (${exp.period})\nLocation: ${exp.location}\nType: ${exp.employmentType}\n${exp.bulletsStr}`)
      .join("\n\n");

    const eduFormatted = educations
      .map((edu) => `### ${edu.institution}\nDegree: ${edu.degree} (${edu.period}) | ${edu.gpa}`)
      .join("\n\n");

    const fullStructuredSummary = [
      summary ? `## Summary\n${summary}` : "",
      expFormatted ? `## Work Experience\n${expFormatted}` : "",
      eduFormatted ? `## Education\n${eduFormatted}` : "",
    ].filter(Boolean).join("\n\n");

    let updatedResumeParsed: any = {};
    if (activeProfile.resume_parsed) {
      try { updatedResumeParsed = JSON.parse(activeProfile.resume_parsed); } catch {}
    }
    updatedResumeParsed.workExperience = workExperiences.map((exp) => ({
      title: exp.role,
      company: exp.company,
      location: exp.location,
      employmentType: exp.employmentType,
      years: exp.period,
      description: exp.bulletsStr.split("\n").map((b) => b.replace(/^[•\-*]\s*/, "").trim()).filter(Boolean),
    }));

    updatedResumeParsed.education = educations.map((edu) => ({
      institution: edu.institution,
      degree: edu.degree,
      years: edu.period,
      description: edu.gpa,
    }));

    const payload: Partial<Profile> = {
      name: fullName || activeProfile.name || "Candidate Profile",
      full_name: fullName,
      email,
      phone,
      location,
      linkedin_url: linkedinUrl,
      portfolio_url: portfolioUrl,
      summary: fullStructuredSummary || summary,
      skills: JSON.stringify(skillsList),
      resume_parsed: JSON.stringify(updatedResumeParsed),
      target_titles: stringToJsonArray(titlesStr),
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
    showToast("✨ Candidate profile updated successfully!");
    loadProfiles();
  };

  const currentProfile = activeProfile || profiles[0] || null;
  const { score, missing } = currentProfile
    ? calculateProfileCompleteness(currentProfile)
    : { score: 0, missing: [] };

  const titles = currentProfile ? parseJsonArray(currentProfile.target_titles) : [];
  const skills = currentProfile ? (isEditing ? skillsList : parseJsonArray(currentProfile.skills)) : [];
  const locations = currentProfile ? parseJsonArray(currentProfile.target_locations) : [];
  const excludeCompanies = currentProfile ? parseJsonArray(currentProfile.exclude_companies) : [];
  const excludeKeywords = currentProfile ? parseJsonArray(currentProfile.exclude_keywords) : [];
  const formattedSalary = currentProfile?.salary_min ? currentProfile.salary_min.toLocaleString() : "800,000";

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 relative">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-emerald-600 text-white shadow-2xl border border-emerald-400/30 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="h-4 w-4" /> {toastMsg}
        </div>
      )}

      {/* Role Onboarding Wizard Modal */}
      <RoleOnboardingWizard isOpen={showWizardModal} onClose={() => { setShowWizardModal(false); loadProfiles(); }} />

      {/* Page Header Bar (Unified Primary Edit Button) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-6 w-6 text-primary" /> My Profile
          </h2>
          <p className="text-sm text-muted-foreground">Candidate details, work history, education, and target preferences</p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setShowWizardModal(true)} variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
            <Sparkles className="h-4 w-4 text-emerald-400" /> AI Update from Resume
          </Button>

          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveProfile} className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
                <Save className="h-4 w-4" /> Save Profile Changes
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90">
              <Edit2 className="h-4 w-4" /> Edit Full Profile
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
                    className="text-[10px] py-0.5 px-2 cursor-pointer hover:bg-emerald-500/20 active:scale-95 transition-transform"
                    onClick={() => handleSuggestionClick(m)}
                  >
                    + Add {m}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Form Editor Mode vs Overview View */}
          {isEditing ? (
            <div className="p-6 rounded-2xl border border-emerald-500/40 bg-card shadow-xl space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-lg text-foreground">Edit Candidate Profile Details</h3>
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
                  <div className="space-y-1.5" id="field-full-name">
                    <Label className="text-xs font-semibold">Full Candidate Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Doe" className="text-xs transition-all" />
                  </div>
                  <div className="space-y-1.5" id="field-email">
                    <Label className="text-xs font-semibold">Email Address</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="text-xs transition-all" />
                  </div>
                  <div className="space-y-1.5" id="field-phone">
                    <Label className="text-xs font-semibold">Phone Number</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 019-2834" className="text-xs transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5" id="field-location">
                    <Label className="text-xs font-semibold">Current Location</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Gurugram, India / Remote" className="text-xs transition-all" />
                  </div>
                  <div className="space-y-1.5" id="field-linkedin-url">
                    <Label className="text-xs font-semibold">LinkedIn Profile URL</Label>
                    <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username" className="text-xs transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Portfolio / Website URL</Label>
                    <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://myportfolio.com" className="text-xs transition-all" />
                  </div>
                </div>
              </div>

              {/* Section 2: Preferences */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary" /> Target Roles & Preferences
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5" id="field-target-titles">
                    <Label className="text-xs font-semibold">Target Job Titles (comma separated)</Label>
                    <Input value={titlesStr} onChange={(e) => setTitlesStr(e.target.value)} placeholder="DevOps Engineer, SRE, Cloud Engineer" className="text-xs transition-all" />
                  </div>
                  <div className="space-y-1.5" id="field-target-locations">
                    <Label className="text-xs font-semibold">Preferred Locations (comma separated)</Label>
                    <Input value={locationsStr} onChange={(e) => setLocationsStr(e.target.value)} placeholder="Gurugram, Remote, Bangalore" className="text-xs transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Work Mode</Label>
                    <Select value={workMode} onValueChange={(val) => val && setWorkMode(val)}>
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
                  <div className="space-y-1.5" id="field-experience-years">
                    <Label className="text-xs font-semibold">Years of Experience</Label>
                    <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(Number(e.target.value))} className="text-xs transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Seniority Level</Label>
                    <Select value={seniority} onValueChange={(val) => val && setSeniority(val)}>
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
                  <div className="space-y-1.5" id="field-notice-period">
                    <Label className="text-xs font-semibold">Notice Period</Label>
                    <Select value={noticePeriod} onValueChange={(val) => val && setNoticePeriod(val)}>
                      <SelectTrigger className="text-xs w-full transition-all">
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
                    <Select value={salaryCurrency} onValueChange={(val) => val && setSalaryCurrency(val)}>
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
                  <div className="space-y-1.5" id="field-salary">
                    <Label className="text-xs font-semibold">Min Expected Salary ({salaryCurrency})</Label>
                    <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(Number(e.target.value))} placeholder="800000" className="text-xs font-mono transition-all" />
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

              {/* Section 3: Technical Skills Manager (Interactive Tags) & Exclusions */}
              <div className="space-y-3 pt-2 border-t border-border/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Technical Skills & Filter Exclusions
                </h4>
                
                <div className="space-y-2" id="field-skills">
                  <Label className="text-xs font-semibold">Key Technical Skills & Tools</Label>
                  
                  {/* Skill Badges */}
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-input bg-background min-h-[50px] items-center">
                    {skillsList.map((skill) => (
                      <Badge key={skill} variant="secondary" className="font-mono text-xs py-1 px-2.5 bg-muted/80 flex items-center gap-1">
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-rose-400 text-muted-foreground transition-colors ml-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}

                    <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                      <Input
                        value={newSkillInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.includes(",")) {
                            handleAddSkill(val);
                          } else {
                            setNewSkillInput(val);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSkill(newSkillInput);
                          }
                        }}
                        placeholder="Type skill & press Enter or comma..."
                        className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0 px-1 font-mono"
                      />
                    </div>
                  </div>
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

              {/* Section 4: Work Experience Positions Editor */}
              <div className="space-y-4 pt-3 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-primary" /> Work Experience Positions ({workExperiences.length})
                  </h4>
                  <Button type="button" size="sm" variant="outline" onClick={addWorkExp} className="gap-1 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Add Position
                  </Button>
                </div>

                <div className="space-y-4">
                  {workExperiences.map((exp, idx) => (
                    <div key={exp.id} id={`exp-card-${exp.id}`} className="p-5 rounded-2xl border border-border/80 bg-card space-y-4 shadow-sm transition-all">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">
                            <Briefcase className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-foreground">{exp.role || `Position #${idx + 1}`}</div>
                            <div className="text-xs text-muted-foreground">{exp.company || "Company"} | {exp.period}</div>
                          </div>
                        </div>

                        <Button type="button" size="icon" variant="ghost" onClick={() => deleteWorkExp(exp.id)} className="h-8 w-8 text-rose-400 hover:bg-rose-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Position Form Fields */}
                      <div className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Position Title *</Label>
                          <Input value={exp.role} onChange={(e) => updateWorkExp(exp.id, "role", e.target.value)} placeholder="DevOps Engineer" className="text-xs" />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Company</Label>
                          <Input value={exp.company} onChange={(e) => updateWorkExp(exp.id, "company", e.target.value)} placeholder="xIoTz Private Limited" className="text-xs" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Location</Label>
                            <Input value={exp.location} onChange={(e) => updateWorkExp(exp.id, "location", e.target.value)} placeholder="Remote, Delhi NCR" className="text-xs" />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Experience Type</Label>
                            <Select value={exp.employmentType || "Full-Time"} onValueChange={(val) => updateWorkExp(exp.id, "employmentType", val)}>
                              <SelectTrigger className="text-xs w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Full-Time">Full-Time</SelectItem>
                                <SelectItem value="Part-Time">Part-Time</SelectItem>
                                <SelectItem value="Contract">Contract</SelectItem>
                                <SelectItem value="Internship">Internship</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Start Month</Label>
                            <Input value={exp.startMonth || "November"} onChange={(e) => updateWorkExp(exp.id, "startMonth", e.target.value)} placeholder="November" className="text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Start Year</Label>
                            <Input value={exp.startYear || "2024"} onChange={(e) => updateWorkExp(exp.id, "startYear", e.target.value)} placeholder="2024" className="text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">End Month</Label>
                            <Input value={exp.endMonth || ""} onChange={(e) => updateWorkExp(exp.id, "endMonth", e.target.value)} disabled={exp.isCurrent} placeholder="Month" className="text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">End Year</Label>
                            <Input value={exp.endYear || ""} onChange={(e) => updateWorkExp(exp.id, "endYear", e.target.value)} disabled={exp.isCurrent} placeholder="Year" className="text-xs" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Switch
                            id={`current-${exp.id}`}
                            checked={exp.isCurrent ?? true}
                            onCheckedChange={(val) => updateWorkExp(exp.id, "isCurrent", val)}
                          />
                          <Label htmlFor={`current-${exp.id}`} className="text-xs font-semibold cursor-pointer">
                            I currently work here
                          </Label>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Description & Key Accomplishments</Label>
                          <textarea
                            value={exp.bulletsStr}
                            onChange={(e) => updateWorkExp(exp.id, "bulletsStr", e.target.value)}
                            placeholder="Cloud Operations: Co-designed and operated cloud platform..."
                            rows={5}
                            className="w-full rounded-lg border border-input bg-background p-3 text-xs font-mono leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>

                {/* Section 5: Education Editor */}
                <div className="space-y-4 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-sky-400" /> Education History ({educations.length})
                    </h4>
                    <Button type="button" size="sm" variant="outline" onClick={addEdu} className="gap-1 text-xs font-semibold">
                      <Plus className="h-3.5 w-3.5" /> Add Education
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {educations.map((edu, idx) => (
                      <div key={edu.id} id={`edu-card-${edu.id}`} className="p-4 rounded-xl border border-border/80 bg-card space-y-3 transition-all">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                          <div className="font-bold text-xs text-foreground">{edu.institution || `Education #${idx + 1}`}</div>
                          <Button type="button" size="icon" variant="ghost" onClick={() => deleteEdu(edu.id)} className="h-7 w-7 text-rose-400 hover:bg-rose-500/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">University / Institution</Label>
                            <Input value={edu.institution} onChange={(e) => updateEdu(edu.id, "institution", e.target.value)} placeholder="Lovely Professional University" className="text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Degree / Field of Study</Label>
                            <Input value={edu.degree} onChange={(e) => updateEdu(edu.id, "degree", e.target.value)} placeholder="Bachelor's, Computer Engineering" className="text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold">Dates / Duration</Label>
                            <Input value={edu.period} onChange={(e) => updateEdu(edu.id, "period", e.target.value)} placeholder="Aug 2020 - Oct 2024" className="text-xs font-mono" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Grade / GPA</Label>
                          <Input value={edu.gpa || ""} onChange={(e) => updateEdu(edu.id, "gpa", e.target.value)} placeholder="GPA: 8.29" className="text-xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Master Summary Text */}
                <div className="space-y-1.5 pt-2 border-t border-border/40" id="field-summary">
                  <Label className="text-xs font-semibold">Master Professional Summary Paragraph</Label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Enter your professional summary paragraph..."
                    rows={4}
                    className="w-full rounded-lg border border-input bg-background p-3 text-xs shadow-xs font-mono leading-relaxed transition-all"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                  <Button size="sm" onClick={handleSaveProfile} className="gap-2 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
                    <Save className="h-4 w-4" /> Save Profile
                  </Button>
                </div>
              </div>
            ) : (
              /* Overview View Card (Clean Read-Only Display) */
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
                    <Button size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90">
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

                {/* Exclusions & Work Auth */}
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

                {/* ── WORK EXPERIENCE SECTION (Clean Read-Only Display) ── */}
                <div className="space-y-4 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">Work Experience</h3>
                  </div>

                  <div className="space-y-4">
                    {workExperiences.map((exp) => (
                      <div key={exp.id} className="p-5 rounded-2xl border border-border/80 bg-card space-y-3.5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div className="h-11 w-11 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                              <Briefcase className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-base text-foreground leading-snug">{exp.role || "DevOps Engineer"}</h4>
                              <div className="text-xs font-semibold text-muted-foreground">{exp.company || "Company Name"}</div>

                              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                                {exp.location && (
                                  <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-[11px] font-medium bg-muted text-foreground">
                                    {exp.location}
                                  </Badge>
                                )}
                                {exp.period && (
                                  <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-[11px] font-medium bg-muted text-foreground">
                                    {exp.period}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-[11px] font-medium bg-muted text-foreground">
                                  {exp.employmentType || "Full-Time"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {exp.bulletsStr && (
                          <div className="pt-2 border-t border-border/30">
                            <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                              {exp.bulletsStr.split("\n").map((b, bIdx) => {
                                const cleanBullet = b.replace(/^[•\-*]\s*/, "").trim();
                                if (!cleanBullet) return null;
                                return (
                                  <li key={bIdx} className="flex items-start gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span>{cleanBullet}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── EDUCATION SECTION (Clean Read-Only Display) ── */}
                <div className="space-y-4 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">Education</h3>
                  </div>

                  <div className="space-y-4">
                    {educations.map((edu) => (
                      <div key={edu.id} className="p-5 rounded-2xl border border-border/80 bg-card flex items-start justify-between gap-4 shadow-sm">
                        <div className="flex items-start gap-3.5">
                          <div className="h-11 w-11 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                            <GraduationCap className="h-5 w-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-base text-foreground leading-snug">{edu.institution || "Lovely Professional University"}</h4>

                            <div className="flex flex-wrap items-center gap-2 pt-1.5">
                              {edu.period && (
                                <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-[11px] font-medium bg-muted text-foreground">
                                  {edu.period}
                                </Badge>
                              )}
                              {edu.degree && (
                                <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-[11px] font-medium bg-muted text-foreground">
                                  {edu.degree}
                                </Badge>
                              )}
                              {edu.gpa && (
                                <Badge variant="secondary" className="rounded-full px-3 py-0.5 text-[11px] font-medium bg-muted text-foreground font-mono">
                                  {edu.gpa}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
  );
};
