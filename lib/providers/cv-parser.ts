/**
 * Dynamic Master CV Section Parser & Extractor
 * Pure dynamic parsing with zero hardcoded static fallbacks.
 */

export interface MasterCVEvidence {
  header: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedinUrl?: string;
  };
  summary: string;
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    location?: string;
    period?: string;
    bullets: string[];
  }>;
  projects: Array<{
    title: string;
    description: string;
    tech?: string[];
  }>;
  certifications: Array<{
    title: string;
    issuer?: string;
    year?: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
  }>;
}

export function parseMasterCV(markdownOrText: string): MasterCVEvidence {
  const result: MasterCVEvidence = {
    header: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
    },
    summary: "",
    skills: [],
    experience: [],
    projects: [],
    certifications: [],
    education: [],
  };

  if (!markdownOrText || !markdownOrText.trim()) return result;

  const lines = markdownOrText.split("\n").map((l) => l.trim()).filter(Boolean);

  // Contact Info Extractor
  const emailMatch = markdownOrText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = markdownOrText.match(/(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
  
  result.header.email = emailMatch ? emailMatch[0] : "";
  result.header.phone = phoneMatch ? phoneMatch[0] : "";

  // Dynamic Name Extractor: Top lines of resume before section headers
  const topLines = lines.slice(0, 5);
  const nameCandidate = topLines.find((l) => {
    const lower = l.toLowerCase();
    return (
      l.length >= 2 &&
      l.length < 40 &&
      !l.includes("@") &&
      !/\d/.test(l) &&
      !lower.startsWith("summary") &&
      !lower.startsWith("experience") &&
      !lower.startsWith("education") &&
      !lower.startsWith("skills") &&
      !lower.startsWith("projects") &&
      !lower.includes("curriculum") &&
      !lower.includes("resume")
    );
  });
  result.header.fullName = nameCandidate || "";

  // Dynamic Location Extractor
  const locLine = topLines.find((l) => l.includes("India") || l.includes("USA") || l.includes("UK") || l.includes("Remote") || l.includes("NCR") || l.includes("CA") || l.includes("NY"));
  if (locLine) {
    const locParts = locLine.split("|").map((p) => p.trim());
    result.header.location = locParts.find((p) => p.includes("India") || p.includes("Remote") || p.includes("USA") || p.includes("NCR") || p.includes("CA")) || locParts[0] || "";
  }

  let activeSection = "header";
  let currentJob: { role: string; company: string; location?: string; period?: string; bullets: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Dynamic Section Header Detection
    if (lower === "summary" || lower.startsWith("summary") || lower.startsWith("## summary") || lower.startsWith("professional summary")) {
      activeSection = "summary";
      continue;
    } else if (lower.includes("experience") || lower.includes("employment history") || lower.startsWith("## experience")) {
      activeSection = "experience";
      continue;
    } else if (lower.startsWith("project") || lower.includes("projects") || lower.startsWith("## projects")) {
      activeSection = "projects";
      continue;
    } else if (lower.includes("certificate") || lower.includes("certification") || lower.startsWith("## certifications")) {
      activeSection = "certifications";
      continue;
    } else if (lower.includes("education") || lower.includes("academic") || lower.startsWith("## education")) {
      activeSection = "education";
      continue;
    } else if (lower === "skills" || lower.startsWith("skills") || lower.startsWith("## skills")) {
      activeSection = "skills";
      continue;
    }

    if (activeSection === "summary") {
      result.summary += (result.summary ? " " : "") + line;
    } else if (activeSection === "skills") {
      const skillsInLine = line.split(/[•·|,]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 30);
      result.skills.push(...skillsInLine);
    } else if (activeSection === "experience") {
      const isHeaderLine = line.includes("|") || line.includes("Present") || line.includes("202") || line.includes("201") || line.includes("Limited") || line.includes("Inc") || line.includes("Corp") || line.includes("Private");
      
      if (isHeaderLine) {
        const parts = line.split("|").map((p) => p.trim());
        const roleOrComp = parts[0] || line;
        const compOrLoc = parts[1] || "";
        const periodOrLoc = parts.slice(2).join(" | ");

        currentJob = {
          role: roleOrComp,
          company: compOrLoc,
          location: periodOrLoc,
          period: "",
          bullets: [],
        };
        result.experience.push(currentJob);
      } else if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
        const bulletText = line.replace(/^[•\-*]\s*/, "");
        if (currentJob) {
          currentJob.bullets.push(bulletText);
        } else if (result.experience.length > 0) {
          result.experience[result.experience.length - 1].bullets.push(bulletText);
        }
      } else if (currentJob) {
        if (currentJob.bullets.length === 0) {
          currentJob.company = currentJob.company ? `${currentJob.company} — ${line}` : line;
        } else {
          currentJob.bullets.push(line);
        }
      } else if (line.length > 3 && line.length < 60) {
        currentJob = {
          role: line,
          company: "",
          bullets: [],
        };
        result.experience.push(currentJob);
      }
    } else if (activeSection === "projects") {
      const projParts = line.split("—");
      const title = projParts[0]?.replace(/^[•\-*]\s*/, "").trim() || line;
      const desc = projParts.slice(1).join(" — ").trim() || "";

      if (title.length > 2) {
        result.projects.push({
          title,
          description: desc,
        });
      }
    } else if (activeSection === "certifications") {
      if (!lower.startsWith("by ")) {
        result.certifications.push({
          title: line.replace(/^[•\-*]\s*/, "").trim(),
          issuer: lines[i + 1]?.toLowerCase().startsWith("by ") ? lines[i + 1].replace(/^by\s*/i, "").trim() : "",
        });
      }
    } else if (activeSection === "education") {
      if (line.length > 3) {
        const eduParts = line.split("|").map((p) => p.trim());
        result.education.push({
          degree: eduParts[0] || line,
          institution: eduParts[1] || lines[i + 1] || "",
          year: eduParts[2] || "",
        });
      }
    }
  }

  return result;
}
