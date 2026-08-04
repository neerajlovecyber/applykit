import React from "react";
import {
  User,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Award,
  Wrench,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { parseMasterCV } from "@/lib/providers/cv-parser";

interface ResumeParsedViewProps {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  skills: string[];
  summaryText: string;
}

export const ResumeParsedView: React.FC<ResumeParsedViewProps> = ({
  fullName,
  email,
  phone,
  location,
  skills,
  summaryText,
}) => {
  const masterCV = parseMasterCV(summaryText);

  const name = fullName || masterCV.header.fullName || "Neeraj Singh";
  const emailAddr = email || masterCV.header.email || "neerajlovecyber@gmail.com";
  const phoneNum = phone || masterCV.header.phone || "+91 7988815263";
  const locStr = location || masterCV.header.location || "Delhi NCR, India";

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const finalSkills = skills.length > 0 ? skills : masterCV.skills;

  return (
    <div className="space-y-4 font-sans text-foreground">
      {/* 1. Career-Ops Header Contact Card */}
      <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary font-bold text-base flex items-center justify-center shrink-0 border border-primary/30 shadow-inner">
            {initials}
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-foreground leading-none">{name}</h4>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 pt-0.5 font-medium">
              {emailAddr && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-primary" /> {emailAddr}
                </span>
              )}
              {phoneNum && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-primary" /> {phoneNum}
                </span>
              )}
              {locStr && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {locStr}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Professional Summary Card */}
      {masterCV.summary && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <div className="text-xs font-bold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Professional Summary
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{masterCV.summary}</p>
        </div>
      )}

      {/* 3. Work Experience Section */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="text-xs font-bold text-foreground flex items-center justify-between border-b border-border/50 pb-2">
          <span className="flex items-center gap-2 font-bold">
            <Briefcase className="h-4 w-4 text-primary" /> Work Experience ({masterCV.experience.length})
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">Career-Ops Master CV Standard</span>
        </div>

        {masterCV.experience.length > 0 ? (
          <div className="space-y-4">
            {masterCV.experience.map((exp, idx) => (
              <div key={idx} className="space-y-2 text-xs border-l-2 border-primary/40 pl-3.5 py-0.5">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-bold text-foreground text-xs">{exp.role}</div>
                    {exp.company && <div className="text-[11px] text-primary font-medium">{exp.company}</div>}
                  </div>
                  {exp.period && <div className="text-[11px] text-muted-foreground font-mono shrink-0">{exp.period}</div>}
                </div>
                {exp.bullets.length > 0 && (
                  <ul className="space-y-1.5 pt-1 text-[11px] text-muted-foreground list-disc pl-4 leading-relaxed">
                    {exp.bullets.map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted/20 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-mono">
            {summaryText}
          </div>
        )}
      </div>

      {/* 4. Key Projects Section */}
      {masterCV.projects.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="text-xs font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
            <FolderGit2 className="h-4 w-4 text-primary" /> Key Projects ({masterCV.projects.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {masterCV.projects.map((proj, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs space-y-1">
                <div className="font-bold text-foreground">{proj.title}</div>
                {proj.description && <p className="text-[11px] text-muted-foreground leading-relaxed">{proj.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Certifications & Education Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Certifications */}
        {masterCV.certifications.length > 0 && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="text-xs font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
              <Award className="h-4 w-4 text-emerald-400" /> Certifications ({masterCV.certifications.length})
            </div>
            <div className="space-y-2 pt-1">
              {masterCV.certifications.map((cert, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{cert.title}</span>
                  {cert.issuer && <span className="text-[10px] text-muted-foreground">({cert.issuer})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {masterCV.education.length > 0 && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="text-xs font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
              <GraduationCap className="h-4 w-4 text-primary" /> Education ({masterCV.education.length})
            </div>
            <div className="space-y-2 pt-1 text-xs">
              {masterCV.education.map((edu, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold text-foreground">{edu.degree}</div>
                  {edu.institution && <div className="text-[11px] text-primary">{edu.institution}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Master Skills & Toolsets */}
      {finalSkills.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <div className="text-xs font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" /> Master Skills & Toolsets ({finalSkills.length})
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {finalSkills.map((s, idx) => (
              <Badge key={idx} variant="secondary" className="font-mono text-[11px] py-0.5 px-2 bg-muted/60">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
