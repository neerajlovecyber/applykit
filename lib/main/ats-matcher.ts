/**
 * Composite ATS Scoring Engine & Keyword Matcher
 * Modeled after srbhr/Resume-Matcher vector & sub-score analysis.
 */

export interface ATSSubScores {
  keyword_match: number; // 0 - 100%
  skills_coverage: number; // 0 - 100%
  section_completeness: number; // 0 - 100%
}

export interface ATSScoreResult {
  overall_score: number; // 0 - 100%
  sub_scores: ATSSubScores;
  missing_keywords: string[];
  injectable_keywords: string[];
  recommendations: string[];
}

export interface CandidateResumeContext {
  fullName?: string;
  skills: string[];
  summary?: string;
  workExperience: Array<{ title: string; company: string; description?: string | string[] }>;
  projects?: Array<{ title?: string; name?: string; description?: string | string[] }>;
  certifications?: Array<{ title: string; issuer?: string }>;
  education?: Array<{ degree: string; institution: string }>;
}

export interface JobDescriptionContext {
  title: string;
  description: string;
  requiredSkills?: string[];
}

/**
 * Calculates a comprehensive ATS Match Score against a Job Description
 */
export function calculateATSScore(
  candidate: CandidateResumeContext,
  job: JobDescriptionContext
): ATSScoreResult {
  const jdText = `${job.title} ${job.description} ${(job.requiredSkills || []).join(" ")}`.toLowerCase();
  
  // 1. Keyword Extraction from Job Description
  const knownTechKeywords = [
    "kubernetes", "docker", "aws", "terraform", "ansible", "python", "linux", "ci/cd",
    "github actions", "devsecops", "appsec", "burp suite", "metasploit", "wazuh", "elk",
    "opensearch", "bash", "shell scripting", "jira", "selenium", "postman", "java", "react",
    "typescript", "node.js", "next.js", "postgresql", "bigquery", "snowflake", "spark", "airflow",
    "pytorch", "tensorflow", "llms", "rag", "openai", "langchain", "golang", "c++", "microservices"
  ];

  const jdKeywords = knownTechKeywords.filter((kw) => jdText.includes(kw));

  // 2. Candidate Skills & Keyword Inventory
  const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase().trim());
  const candidateWorkText = candidate.workExperience
    .map((e) => `${e.title} ${e.company} ${Array.isArray(e.description) ? e.description.join(" ") : e.description || ""}`)
    .join(" ")
    .toLowerCase();
  const candidateProjText = (candidate.projects || [])
    .map((p) => `${p.title || p.name || ""} ${Array.isArray(p.description) ? p.description.join(" ") : p.description || ""}`)
    .join(" ")
    .toLowerCase();
  const candidateFullText = `${candidate.summary || ""} ${candidateSkills.join(" ")} ${candidateWorkText} ${candidateProjText}`.toLowerCase();

  // 3. Sub-Score 1: Keyword Match Percentage
  const matchedKeywords = jdKeywords.filter((kw) => candidateFullText.includes(kw));
  const missingKeywords = jdKeywords.filter((kw) => !candidateFullText.includes(kw));
  const keywordMatchScore = jdKeywords.length > 0 ? Math.round((matchedKeywords.length / jdKeywords.length) * 100) : 75;

  // 4. Sub-Score 2: Skills Coverage Percentage
  const matchedSkills = candidateSkills.filter((s) => jdText.includes(s));
  const skillsCoverageScore = candidateSkills.length > 0 ? Math.min(100, Math.round((matchedSkills.length / Math.max(1, candidateSkills.length)) * 100)) : 60;

  // 5. Sub-Score 3: Section Completeness Rating
  let completenessPoints = 0;
  if (candidate.fullName) completenessPoints += 15;
  if (candidate.summary) completenessPoints += 20;
  if (candidate.skills && candidate.skills.length > 0) completenessPoints += 20;
  if (candidate.workExperience && candidate.workExperience.length > 0) completenessPoints += 25;
  if (candidate.education && candidate.education.length > 0) completenessPoints += 10;
  if (candidate.certifications && candidate.certifications.length > 0) completenessPoints += 10;
  const sectionCompletenessScore = Math.min(100, completenessPoints);

  // 6. Injectable Keywords Identification
  // Missing keywords in current context that candidate has explicit background in
  const injectableKeywords = missingKeywords.filter((kw) => candidateFullText.includes(kw));

  // 7. Overall Composite ATS Score (Weighted Average: 45% Keyword Match + 35% Skills Coverage + 20% Completeness)
  const overallScore = Math.round(keywordMatchScore * 0.45 + skillsCoverageScore * 0.35 + sectionCompletenessScore * 0.2);

  // 8. Recommendations
  const recommendations: string[] = [];
  if (missingKeywords.length > 0) {
    recommendations.push(`Add key target job keywords: ${missingKeywords.slice(0, 4).join(", ")}.`);
  }
  if (!candidate.summary) {
    recommendations.push("Include a strong professional summary highlighting security & cloud automation.");
  }
  if (candidate.workExperience.length < 2) {
    recommendations.push("Detail at least 2 relevant job roles with quantified bullet points.");
  }

  return {
    overall_score: overallScore,
    sub_scores: {
      keyword_match: keywordMatchScore,
      skills_coverage: skillsCoverageScore,
      section_completeness: sectionCompletenessScore,
    },
    missing_keywords: missingKeywords,
    injectable_keywords: injectableKeywords,
    recommendations,
  };
}
