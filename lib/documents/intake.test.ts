import { describe, it, expect, beforeEach } from "bun:test";
import { normalizeResume } from "./parser";
import { DocumentIntakeService } from "./service";
import * as dbQueries from "@/lib/db";

describe("Document Intake & Normalization Engine", () => {
  it("normalizes Resume-Matcher nested format into canonical NormalizedResume", () => {
    const rawParsed = {
      personalInfo: {
        name: "Alice Montgomery",
        email: "alice@example.com",
        phone: "+1-555-0199",
        location: "Seattle, WA",
      },
      summary: "Senior Cloud & Platform Engineer with 6+ years experience.",
      workExperience: [
        {
          title: "Senior DevOps Engineer",
          company: "CloudScale Systems",
          location: "Seattle, WA",
          years: "2021 – Present",
          description: [
            "Architected Kubernetes microservices on AWS EKS.",
            "Reduced deployment lead time by 45% via GitOps.",
          ],
        },
      ],
      personalProjects: [
        {
          name: "Terraform-K8s-Starter",
          description: "Open source automation templates for AWS EKS.",
        },
      ],
      certifications: [
        {
          title: "AWS Certified Solutions Architect",
          issuer: "Amazon Web Services",
        },
      ],
      education: [
        {
          degree: "B.S. Computer Science",
          institution: "University of Washington",
          years: "2015 – 2019",
        },
      ],
      additional: {
        technicalSkills: ["Kubernetes", "Terraform", "Go", "AWS", "Docker"],
      },
    };

    const normalized = normalizeResume(rawParsed, "Raw resume text here");

    expect(normalized.fullName).toBe("Alice Montgomery");
    expect(normalized.email).toBe("alice@example.com");
    expect(normalized.phone).toBe("+1-555-0199");
    expect(normalized.location).toBe("Seattle, WA");
    expect(normalized.summary).toContain("Senior Cloud & Platform Engineer");
    expect(normalized.skills).toContain("Kubernetes");
    expect(normalized.skills).toContain("Terraform");
    expect(normalized.workExperiences.length).toBe(1);
    expect(normalized.workExperiences[0].role).toBe("Senior DevOps Engineer");
    expect(normalized.workExperiences[0].company).toBe("CloudScale Systems");
    expect(normalized.workExperiences[0].bulletsStr).toContain("• Architected Kubernetes");
    expect(normalized.projects.length).toBe(1);
    expect(normalized.projects[0].title).toBe("Terraform-K8s-Starter");
    expect(normalized.certifications.length).toBe(1);
    expect(normalized.certifications[0].title).toBe("AWS Certified Solutions Architect");
    expect(normalized.educations.length).toBe(1);
    expect(normalized.educations[0].degree).toBe("B.S. Computer Science");
  });

  it("normalizes flat legacy format with string certifications correctly", () => {
    const rawParsed = {
      full_name: "Bob Builder",
      email: "bob@builder.io",
      phone: "9876543210",
      location: "Bengaluru, India",
      summary: "Fullstack developer",
      skills: ["React", "TypeScript", "Node.js"],
      experience_years: 4,
      seniority: "mid",
      work_experience: [
        {
          role: "Frontend Developer",
          company: "Acme Corp",
          duration: "2022 - 2024",
          description: "• Built dashboard UI with Tailwind\n• Integrated GraphQL endpoints",
        },
      ],
      additional: {
        certificationsTraining: ["CKA by Linux Foundation", "Meta Frontend Specialization"],
      },
    };

    const normalized = normalizeResume(rawParsed);

    expect(normalized.fullName).toBe("Bob Builder");
    expect(normalized.email).toBe("bob@builder.io");
    expect(normalized.skills).toEqual(["React", "TypeScript", "Node.js"]);
    expect(normalized.experienceYears).toBe(4);
    expect(normalized.seniority).toBe("mid");
    expect(normalized.workExperiences.length).toBe(1);
    expect(normalized.workExperiences[0].role).toBe("Frontend Developer");
    expect(normalized.workExperiences[0].bullets.length).toBe(2);
    expect(normalized.certifications.length).toBe(2);
    expect(normalized.certifications[0].title).toBe("CKA");
    expect(normalized.certifications[0].issuer).toBe("Linux Foundation");
  });

  it("DocumentIntakeService ingests raw text and creates a Profile Record", async () => {
    const mockLlm = async () => ({
      personalInfo: {
        name: "Carol Danvers",
        email: "carol@marvel.com",
      },
      skills: ["Security", "Python", "Go"],
      experience_years: 5,
    });

    const service = new DocumentIntakeService({
      llmParser: mockLlm,
      pdfExtractor: async () => "Mock Extracted Text",
    });

    const result = await service.intakeResume({
      rawText: "Sample resume text for Carol",
      profileTrackName: "Security Engineering Track",
    });

    expect(result.parsedData.fullName).toBe("Carol Danvers");
    expect(result.parsedData.email).toBe("carol@marvel.com");
    expect(result.parsedData.skills).toContain("Python");
    expect(result.profile).toBeDefined();
    expect(result.profile?.name).toBe("Security Engineering Track");
    expect(result.profile?.full_name).toBe("Carol Danvers");
  });
});
