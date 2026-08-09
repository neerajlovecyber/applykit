import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { useProfileStore } from "@/app/stores/profile-store";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  Shield,
  Cloud,
  Code,
  Database,
  Bot,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  X,
  Compass,
  Wand2,
  UserCheck,
  Briefcase,
  Target,
  GraduationCap,
  FolderGit2,
  Award,
  Wrench,
  User,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Building2,
} from "lucide-react";
import { parseMasterCV } from "@/lib/providers/cv-parser";

interface RoleCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  defaultTitles: string[];
  defaultSkills: string[];
}

const ROLE_CATEGORIES: RoleCategory[] = [
  {
    id: "cybersecurity",
    name: "Cybersecurity, DevSecOps & AppSec",
    icon: Shield,
    description: "Pentesting, Application Security, DevSecOps Pipelines, Vulnerability Management & Security Engineering",
    defaultTitles: ["DevSecOps Engineer", "Penetration Tester", "Application Security Engineer", "Security Analyst"],
    defaultSkills: ["Burp Suite", "Metasploit", "DevSecOps", "AppSec", "Kubernetes", "Docker", "Wazuh", "Linux", "Python", "CI/CD"],
  },
  {
    id: "devops",
    name: "DevOps, DevSecOps & Cloud SRE",
    icon: Cloud,
    description: "Kubernetes, CI/CD Pipelines, Infrastructure as Code, DevSecOps & Cloud Reliability",
    defaultTitles: ["DevOps Engineer", "DevSecOps Engineer", "Site Reliability Engineer (SRE)", "Cloud Architect"],
    defaultSkills: ["Kubernetes", "Docker", "DevSecOps", "Terraform", "AWS", "CI/CD", "Linux", "Python", "Bash"],
  },
  {
    id: "swe",
    name: "Software & Full Stack Engineer",
    icon: Code,
    description: "Frontend, Backend, Modern React/Node Web Applications & APIs",
    defaultTitles: ["Full Stack Engineer", "Frontend Developer", "Software Engineer", "React Developer"],
    defaultSkills: ["React", "TypeScript", "Node.js", "Next.js", "REST APIs", "TailwindCSS", "PostgreSQL"],
  },
  {
    id: "data",
    name: "Data & Cloud Architect",
    icon: Database,
    description: "Data Pipelines, BigQuery, Analytics Engineering & ETL",
    defaultTitles: ["Data Engineer", "Cloud Data Architect", "Analytics Engineer", "BigData Developer"],
    defaultSkills: ["Python", "SQL", "BigQuery", "Snowflake", "Spark", "Airflow", "ETL Pipelines"],
  },
  {
    id: "ai",
    name: "AI & ML Engineer",
    icon: Bot,
    description: "LLMs, Machine Learning, RAG, PyTorch & Generative AI Applications",
    defaultTitles: ["AI Engineer", "Machine Learning Engineer", "LLM Developer", "AI Architect"],
    defaultSkills: ["Python", "PyTorch", "TensorFlow", "LLMs", "RAG", "OpenAI API", "LangChain", "Vector DB"],
  },
];

export interface WorkExpItem {
  id: string;
  role: string;
  company: string;
  location: string;
  period: string;
  bulletsStr: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
}

export interface CertItem {
  id: string;
  title: string;
  issuer: string;
}

export interface EduItem {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

interface RoleOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleOnboardingWizard: React.FC<RoleOnboardingWizardProps> = ({ isOpen, onClose }) => {
  const conveyor = useConveyor();
  const navigate = useNavigate();
  const { setProfiles, setActiveProfile } = useProfileStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state: Resume Text Paste & Extraction
  const [rawResumeInput, setRawResumeInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatusMsg, setParseStatusMsg] = useState("");

  // Step 2 state: Structured Item Lists
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [profSummary, setProfSummary] = useState("");

  const [workExperiences, setWorkExperiences] = useState<WorkExpItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [certifications, setCertifications] = useState<CertItem[]>([]);
  const [educations, setEducations] = useState<EduItem[]>([]);
  const [skillsStr, setSkillsStr] = useState("Burp Suite, Metasploit, DevSecOps, AppSec, Cloud Security");
  const [experienceYears, setExperienceYears] = useState<number>(3);
  const [seniority, setSeniority] = useState("mid");

  // Step 3 state: Profile Track Name, Role Category & Salary Preferences
  const [profileTrackName, setProfileTrackName] = useState("DevSecOps & Security Track");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("cybersecurity");
  const [targetTitlesStr, setTargetTitlesStr] = useState("DevSecOps Engineer, Penetration Tester, Security Engineer");
  const [locationsStr, setLocationsStr] = useState("Remote, Bangalore, India");
  const [salaryMin, setSalaryMin] = useState<number>(800000); // 8 LPA default!
  const [autoCreateSearches, setAutoCreateSearches] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Category selection handler
  const handleSelectCategory = (cat: RoleCategory) => {
    setSelectedCategoryId(cat.id);
    setTargetTitlesStr(cat.defaultTitles.join(", "));
    if (!skillsStr || skillsStr.split(",").length < 3) {
      setSkillsStr(cat.defaultSkills.join(", "));
    }
  };

  // Real AI LLM Resume Parse Handler
  const handleParseResumeText = async () => {
    if (!rawResumeInput.trim()) return;
    setIsParsing(true);
    setParseStatusMsg("");

    try {
      console.log("[RoleWizard] Extracting candidate details with AI LLM (Resume-Matcher format)...");
      const parsed = await conveyor.data.parseResume(rawResumeInput);

      // ── Normalize Resume-Matcher camelCase output → flat fields ────────────
      // LLM returns either flat fields (old) or Resume-Matcher personalInfo/workExperience format.
      const piName = parsed.personalInfo?.name || parsed.personal_info?.full_name || parsed.full_name || "";
      const piEmail = parsed.personalInfo?.email || parsed.personal_info?.email || parsed.email || "";
      const piPhone = parsed.personalInfo?.phone || parsed.personal_info?.phone || parsed.phone || "";
      const piLocation = parsed.personalInfo?.location || parsed.personal_info?.location || parsed.location || "";

      // Skills: merge additional.technicalSkills + flat skills array
      const aiSkills: string[] = [
        ...(parsed.additional?.technicalSkills || []),
        ...(parsed.skills || []),
      ].filter(Boolean);

      // Certs from additional.certificationsTraining
      const aiCertStrings: string[] = parsed.additional?.certificationsTraining || [];

      // Work Experience: prefer camelCase workExperience, fall back to work_experience
      const aiWorkExp = parsed.workExperience || parsed.work_experience || [];

      // Projects: prefer personalProjects, fall back to projects
      const aiProjects = parsed.personalProjects || parsed.projects || [];

      // Education: always in education[]
      const aiEducation = parsed.education || [];

      // Certifications: prefer structured certifications[], then parse from strings
      const aiCertObjects = parsed.certifications || [];

      setFullName(piName);
      setEmail(piEmail);
      setPhone(piPhone);
      setLocation(piLocation);
      setProfSummary(parsed.summary || "");

      // 1. Work Experience → item cards
      if (aiWorkExp.length > 0) {
        setWorkExperiences(
          aiWorkExp.map((exp, idx) => {
            const rawDesc = exp.description;
            const descStr = Array.isArray(rawDesc)
              ? rawDesc.map((b) => (b.startsWith("•") ? b : `• ${b}`)).join("\n")
              : (rawDesc || "");
            return {
              id: `exp-${idx}-${Date.now()}`,
              role: exp.title || "",
              company: exp.company || "",
              location: (exp as any).location || "",
              period: (exp as any).duration || (exp as any).years || "",
              bulletsStr: descStr,
            };
          })
        );
      }

      // 2. Projects → item cards (personalProjects or projects)
      if (aiProjects.length > 0) {
        setProjects(
          aiProjects.map((p, idx) => {
            const rawDesc = p.description;
            const descStr = Array.isArray(rawDesc) ? rawDesc.join("\n") : (rawDesc || "");
            return {
              id: `proj-${idx}-${Date.now()}`,
              title: (p as any).title || p.name || "",
              description: descStr,
            };
          })
        );
      }

      // 3. Certifications → item cards
      //    Prefer structured certifications[], but if empty, parse aiCertStrings
      if (aiCertObjects.length > 0) {
        setCertifications(
          aiCertObjects.map((c, idx) => ({
            id: `cert-${idx}-${Date.now()}`,
            title: c.title || "",
            issuer: c.issuer || "",
          }))
        );
      } else if (aiCertStrings.length > 0) {
        setCertifications(
          aiCertStrings.map((cert, idx) => {
            const parts = cert.split(/\s*[-–by|]\s*/i);
            return {
              id: `cert-${idx}-${Date.now()}`,
              title: parts[0]?.trim() || cert,
              issuer: parts[1]?.trim() || "",
            };
          })
        );
      }

      // 4. Education → item cards
      if (aiEducation.length > 0) {
        setEducations(
          aiEducation.map((e, idx) => ({
            id: `edu-${idx}-${Date.now()}`,
            degree: e.degree || "",
            institution: e.institution || "",
            year: e.years || e.year || "",
          }))
        );
      }

      // 5. Skills → comma-separated string
      if (aiSkills.length > 0) {
        setSkillsStr(aiSkills.join(", "));
      }

      if (parsed.experience_years) setExperienceYears(parsed.experience_years);
      if (parsed.seniority) setSeniority(parsed.seniority.toLowerCase());

      const skillText = (aiSkills.join(" ") + rawResumeInput).toLowerCase();
      if (skillText.includes("devsecops") || skillText.includes("security") || skillText.includes("pentest")) {
        setProfileTrackName("DevSecOps & Security Track");
        setSelectedCategoryId("cybersecurity");
        setTargetTitlesStr("DevSecOps Engineer, Penetration Tester, Security Specialist");
      } else if (skillText.includes("devops") || skillText.includes("kubernetes")) {
        setProfileTrackName("DevOps & Cloud SRE Track");
        setSelectedCategoryId("devops");
        setTargetTitlesStr("DevOps Engineer, DevSecOps Engineer, SRE");
      }

      setParseStatusMsg("✨ All resume sections extracted with AI into editable item cards!");
      setStep(2);
    } catch (err) {
      console.error("[RoleWizard] AI extraction error:", err);
      setParseStatusMsg("Could not parse resume automatically. You can fill fields manually.");
      setStep(2);
    } finally {
      setIsParsing(false);
    }
  };


  // Item List Handlers
  const addWorkExp = () => {
    setWorkExperiences((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}`,
        role: "DevOps Engineer",
        company: "Company Name",
        location: "Location",
        period: "2024 – Present",
        bulletsStr: "• Key responsibility / accomplishment",
      },
    ]);
  };

  const updateWorkExp = (id: string, field: keyof WorkExpItem, val: string) => {
    setWorkExperiences((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const deleteWorkExp = (id: string) => {
    setWorkExperiences((prev) => prev.filter((item) => item.id !== id));
  };

  const addProject = () => {
    setProjects((prev) => [...prev, { id: `proj-${Date.now()}`, title: "New Project", description: "Project description" }]);
  };

  const updateProject = (id: string, field: keyof ProjectItem, val: string) => {
    setProjects((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((item) => item.id !== id));
  };

  const addCert = () => {
    setCertifications((prev) => [...prev, { id: `cert-${Date.now()}`, title: "New Certification", issuer: "Issuer" }]);
  };

  const updateCert = (id: string, field: keyof CertItem, val: string) => {
    setCertifications((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const deleteCert = (id: string) => {
    setCertifications((prev) => prev.filter((item) => item.id !== id));
  };

  const addEdu = () => {
    setEducations((prev) => [...prev, { id: `edu-${Date.now()}`, degree: "Degree Title", institution: "University Name", year: "2020 – 2024" }]);
  };

  const updateEdu = (id: string, field: keyof EduItem, val: string) => {
    setEducations((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const deleteEdu = (id: string) => {
    setEducations((prev) => prev.filter((item) => item.id !== id));
  };

  // Finish Onboarding: Create Profile & Auto-Search Queries
  const handleFinishOnboarding = async () => {
    setIsSaving(true);
    try {
      const stringToJsonArray = (str: string) =>
        JSON.stringify(str.split(",").map((s) => s.trim()).filter(Boolean));

      // Construct Master Summary from item lists
      const expFormatted = workExperiences
        .map((exp) => `### ${exp.role} — ${exp.company} (${exp.period})\nLocation: ${exp.location}\n${exp.bulletsStr}`)
        .join("\n\n");

      const projFormatted = projects.map((p) => `- **${p.title}**: ${p.description}`).join("\n");
      const certFormatted = certifications.map((c) => `- **${c.title}** (${c.issuer})`).join("\n");
      const eduFormatted = educations.map((e) => `- **${e.degree}** | ${e.institution} (${e.year})`).join("\n");

      const fullStructuredMasterSummary = `
## Professional Summary
${profSummary}

## Work Experience
${expFormatted}

## Key Projects
${projFormatted}

## Certifications
${certFormatted}

## Education
${eduFormatted}
`.trim();

      const structuredResumeParsed = {
        personalInfo: {
          name: fullName || "Applicant Candidate",
          email: email || "",
          phone: phone || "",
          location: location || "",
        },
        summary: profSummary,
        workExperience: workExperiences.map((exp) => ({
          title: exp.role,
          company: exp.company,
          location: exp.location,
          years: exp.period,
          description: exp.bulletsStr.split("\n").map((b) => b.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean),
        })),
        education: educations.map((e) => ({
          degree: e.degree,
          institution: e.institution,
          years: e.year,
        })),
        personalProjects: projects.map((p) => ({
          name: p.title,
          description: p.description,
        })),
        certifications: certifications.map((c) => ({
          title: c.title,
          issuer: c.issuer,
        })),
        additional: {
          technicalSkills: skillsStr.split(",").map((s) => s.trim()).filter(Boolean),
        },
      };

      // 1. Create SQLite Profile
      const createdProfile = await conveyor.data.createProfile({
        name: profileTrackName.trim() || "Target Profile Track",
        full_name: fullName || "Applicant Candidate",
        email: email,
        phone: phone,
        location: location,
        summary: fullStructuredMasterSummary,
        target_titles: stringToJsonArray(targetTitlesStr),
        skills: stringToJsonArray(skillsStr),
        target_locations: stringToJsonArray(locationsStr),
        experience_years: experienceYears,
        seniority: seniority,
        salary_min: salaryMin || 800000,
        salary_currency: "INR",
        work_mode: "any",
        resume_parsed: JSON.stringify(structuredResumeParsed),
      });

      if (createdProfile?.id) {
        await conveyor.data.setActiveProfile(createdProfile.id);
      }

      // 2. Auto-create Search Queries
      if (autoCreateSearches && createdProfile?.id) {
        const titles = targetTitlesStr.split(",").map((s) => s.trim()).filter(Boolean);
        const firstLocation = locationsStr.split(",")[0]?.trim() || "Remote";

        for (const title of titles.slice(0, 2)) {
          await conveyor.data.createSearchQuery({
            profile_id: createdProfile.id,
            source: "indeed",
            keywords: title,
            location: firstLocation,
            max_pages: 3,
            run_interval_hours: 24,
          });
        }
      }

      // Refresh profiles list in store
      const list = await conveyor.data.getProfiles();
      setProfiles(list);
      const active = list.find((p) => p.is_active === 1) || list[0] || null;
      if (active) setActiveProfile(active);

      onClose();
      navigate("/auto-apply");
    } catch (err) {
      console.error("[RoleWizard] Failed to save onboarding:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Candidate Profile & Role Setup</h3>
              <p className="text-xs text-muted-foreground">Build your candidate profile & target role tracks</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mr-2">
              <span className={`px-2 py-0.5 rounded-full ${step === 1 ? "bg-primary text-primary-foreground font-bold" : "bg-muted"}`}>1. Resume Text</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded-full ${step === 2 ? "bg-primary text-primary-foreground font-bold" : "bg-muted"}`}>2. Candidate Fields</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded-full ${step === 3 ? "bg-primary text-primary-foreground font-bold" : "bg-muted"}`}>3. Target Roles</span>
            </div>

            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: PASTE RESUME TEXT & AI AUTO-EXTRACT */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h4 className="font-bold text-lg">Step 1: Paste Resume for AI Auto-Fill</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Copy and paste your resume text below. AI will automatically parse every job, project, certification, and education into individual editable cards.</p>
              </div>

              <div className="space-y-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <span>Resume Text (Copy from PDF / Word / LinkedIn)</span>
                </div>
                <textarea
                  value={rawResumeInput}
                  onChange={(e) => setRawResumeInput(e.target.value)}
                  placeholder="Paste your resume text here (Full Name, Contact Info, Experience, Education, Certifications, Skills)..."
                  rows={8}
                  className="w-full rounded-lg border border-input bg-card p-3 text-xs font-mono outline-none shadow-inner focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">Extracts every work experience role, project, cert, and degree into editable item cards</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setStep(2)} className="text-xs">
                      Skip to Manual Fill →
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleParseResumeText}
                      disabled={isParsing || !rawResumeInput.trim()}
                      className="gap-2 text-xs"
                    >
                      {isParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      ✨ Extract into Item Cards
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW EXTRACTED CANDIDATE FIELDS AS INDIVIDUAL EDITABLE CARDS */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" /> Step 2: Review & Edit Extracted Candidate Item Cards
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Edit role titles, company names, locations, dates, and bullet points for each item independently.</p>
              </div>

              {parseStatusMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{parseStatusMsg}</span>
                </div>
              )}

              {/* 1. Contact Details */}
              <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal Contact Details
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Full Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Neeraj Singh" className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email Address</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="neerajlovecyber@gmail.com" className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Phone Number</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 7988815263" className="text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Current Location</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Delhi NCR, India / Remote" className="text-xs" />
                  </div>
                </div>
              </div>

              {/* 2. Professional Summary Field */}
              <div className="space-y-2 p-4 rounded-xl border border-border bg-card">
                <Label className="text-xs font-bold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" /> Professional Summary
                </Label>
                <textarea
                  value={profSummary}
                  onChange={(e) => setProfSummary(e.target.value)}
                  placeholder="Overview of background, security focus, and core technical strengths..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs leading-relaxed"
                />
              </div>

              {/* 3. Work Experience Items List */}
              <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Work Experience Items ({workExperiences.length})
                  </div>
                  <Button size="sm" variant="outline" onClick={addWorkExp} className="gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add Job Role
                  </Button>
                </div>

                <div className="space-y-4 pt-1">
                  {workExperiences.map((exp, idx) => (
                    <div key={exp.id} className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">Job Role #{idx + 1}</span>
                        <Button size="icon" variant="ghost" onClick={() => deleteWorkExp(exp.id)} className="h-7 w-7 text-rose-400 hover:bg-rose-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Role Title</Label>
                          <Input value={exp.role} onChange={(e) => updateWorkExp(exp.id, "role", e.target.value)} placeholder="DevOps Engineer" className="text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Company / Employer</Label>
                          <Input value={exp.company} onChange={(e) => updateWorkExp(exp.id, "company", e.target.value)} placeholder="xIoTz Private Limited" className="text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Location</Label>
                          <Input value={exp.location} onChange={(e) => updateWorkExp(exp.id, "location", e.target.value)} placeholder="Remote, Delhi NCR" className="text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Date Range / Duration</Label>
                          <Input value={exp.period} onChange={(e) => updateWorkExp(exp.id, "period", e.target.value)} placeholder="Nov 2024 – Present" className="text-xs" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px]">Accomplishments & Bullet Points (1 per line)</Label>
                        <textarea
                          value={exp.bulletsStr}
                          onChange={(e) => updateWorkExp(exp.id, "bulletsStr", e.target.value)}
                          placeholder="• Cloud Operations: Co-designed platform on AWS...&#10;• Infrastructure Automation: Built reproducible deployment workflows..."
                          rows={4}
                          className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-mono leading-relaxed"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Key Projects Items List */}
              <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="text-xs font-bold text-foreground flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4 text-primary" /> Key Projects ({projects.length})
                  </div>
                  <Button size="sm" variant="outline" onClick={addProject} className="gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add Project
                  </Button>
                </div>

                <div className="space-y-3 pt-1">
                  {projects.map((proj, idx) => (
                    <div key={proj.id} className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">Project #{idx + 1}</span>
                        <Button size="icon" variant="ghost" onClick={() => deleteProject(proj.id)} className="h-7 w-7 text-rose-400 hover:bg-rose-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Project Title</Label>
                        <Input value={proj.title} onChange={(e) => updateProject(proj.id, "title", e.target.value)} placeholder="WatchTower Security Scanner" className="text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Description & Tech Details</Label>
                        <textarea
                          value={proj.description}
                          onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                          placeholder="Automated scanner collecting DNS, TLS, WAF, open-port & threat signals..."
                          rows={2}
                          className="w-full rounded-md border border-input bg-background p-2 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Certifications & Education Items Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Certifications Items */}
                <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Award className="h-4 w-4 text-emerald-400" /> Certifications ({certifications.length})
                    </div>
                    <Button size="sm" variant="outline" onClick={addCert} className="gap-1 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Add Cert
                    </Button>
                  </div>

                  <div className="space-y-2 pt-1">
                    {certifications.map((c) => (
                      <div key={c.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Input value={c.title} onChange={(e) => updateCert(c.id, "title", e.target.value)} placeholder="Certified Ethical Hacker (CEH)" className="text-xs flex-1" />
                          <Button size="icon" variant="ghost" onClick={() => deleteCert(c.id)} className="h-7 w-7 text-rose-400 shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Input value={c.issuer} onChange={(e) => updateCert(c.id, "issuer", e.target.value)} placeholder="EC-Council" className="text-xs" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education Items */}
                <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" /> Education ({educations.length})
                    </div>
                    <Button size="sm" variant="outline" onClick={addEdu} className="gap-1 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Add Degree
                    </Button>
                  </div>

                  <div className="space-y-2 pt-1">
                    {educations.map((e) => (
                      <div key={e.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Input value={e.degree} onChange={(e) => updateEdu(e.id, "degree", e.target.value)} placeholder="B.Tech Computer Science" className="text-xs flex-1" />
                          <Button size="icon" variant="ghost" onClick={() => deleteEdu(e.id)} className="h-7 w-7 text-rose-400 shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={e.institution} onChange={(e) => updateEdu(e.id, "institution", e.target.value)} placeholder="Lovely Professional University" className="text-xs" />
                          <Input value={e.year} onChange={(e) => updateEdu(e.id, "year", e.target.value)} placeholder="2020 – 2024" className="text-xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6. Technical Skills & Tools Field */}
              <div className="space-y-2 p-4 rounded-xl border border-border bg-card">
                <Label className="text-xs font-bold flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" /> Master Technical Skills & Tools (comma separated)
                </Label>
                <Input value={skillsStr} onChange={(e) => setSkillsStr(e.target.value)} placeholder="Burp Suite, Metasploit, DevSecOps, Kubernetes, Docker, Python" className="text-xs font-mono" />
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
            </div>
          )}

          {/* STEP 3: NAME PROFILE TRACK & SELECT TARGET ROLES */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" /> Step 3: Name Profile & Select Target Roles
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Name this Profile Track and select target roles to automate discovery and scoring.</p>
              </div>

              {/* Track Name & Category */}
              <div className="space-y-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Profile Track Name</Label>
                  <Input
                    value={profileTrackName}
                    onChange={(e) => setProfileTrackName(e.target.value)}
                    placeholder="e.g. DevSecOps & Cloud Track"
                    className="text-xs font-semibold"
                  />
                  <p className="text-[11px] text-muted-foreground">Keep profiles separate for different role targets (e.g. Profile 1: DevSecOps vs Profile 2: Pentesting)</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Select Primary Role Category</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {ROLE_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => handleSelectCategory(cat)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-primary/15 border-primary ring-1 ring-primary/40 shadow-sm"
                              : "bg-card border-border hover:border-border/80"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="text-xs font-bold text-foreground">{cat.name}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{cat.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Target Job Titles */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Target Job Titles (comma separated)</Label>
                <Input
                  value={targetTitlesStr}
                  onChange={(e) => setTargetTitlesStr(e.target.value)}
                  placeholder="DevSecOps Engineer, Penetration Tester, Security Specialist"
                  className="text-xs"
                />
              </div>

              {/* Preferred Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Preferred Work Locations</Label>
                  <Input
                    value={locationsStr}
                    onChange={(e) => setLocationsStr(e.target.value)}
                    placeholder="Remote, Bangalore, India"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Minimum Expected Salary (INR ₹ / year)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(Number(e.target.value))}
                      placeholder="800000"
                      className="text-xs pl-7 font-mono"
                    />
                    <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-mono">₹</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-mono">
                    ₹{(salaryMin || 800000).toLocaleString("en-IN")} / yr (Default: 8.0 LPA)
                  </p>
                </div>
              </div>

              {/* Auto Create Search Queries Checkbox */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-primary" /> Auto-Create Job Search Queries
                  </div>
                  <p className="text-[11px] text-muted-foreground">Automatically configure Auto-Apply Bot to target matching roles</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoCreateSearches}
                  onChange={(e) => setAutoCreateSearches(e.target.checked)}
                  className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button size="sm" variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} className="gap-1.5 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <Button size="sm" onClick={handleParseResumeText} disabled={isParsing || !rawResumeInput.trim()} className="gap-1.5 text-xs font-semibold">
                {isParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                ✨ Extract into Item Cards
              </Button>
            )}

            {step === 2 && (
              <Button size="sm" onClick={() => setStep(3)} className="gap-1.5 text-xs font-semibold">
                Next: Role Track Setup <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            {step === 3 && (
              <Button size="sm" onClick={handleFinishOnboarding} disabled={isSaving} className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                ✨ Save Profile Track & Launch Engine
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
