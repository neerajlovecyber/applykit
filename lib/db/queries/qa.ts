import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDrizzleDb } from "../index";
import { qaBank, type QABankRecord, type NewQABankRecord } from "../schema";
import { getProfileById } from "./profiles";
import { computeTokenSimilarity } from "@/lib/utils/similarity";

export function getQABankEntries(profileId: string): QABankRecord[] {
  const db = getDrizzleDb();
  return db
    .select()
    .from(qaBank)
    .where(eq(qaBank.profile_id, profileId))
    .orderBy(desc(qaBank.use_count), desc(qaBank.created_at))
    .all();
}

export function getQABankEntryById(id: string): QABankRecord | undefined {
  return getDrizzleDb().select().from(qaBank).where(eq(qaBank.id, id)).get();
}

export function findQAAnswer(profileId: string, questionPattern: string): QABankRecord | undefined {
  const db = getDrizzleDb();

  // 1. Exact match
  const exact = db
    .select()
    .from(qaBank)
    .where(and(eq(qaBank.profile_id, profileId), eq(qaBank.question_pattern, questionPattern)))
    .get();

  if (exact) return exact;

  // 2. Substring match (input contains pattern or pattern contains input)
  const allEntries = getQABankEntries(profileId);
  const normInput = questionPattern.toLowerCase();

  const substringMatch = allEntries.find((entry) => {
    const normPattern = entry.question_pattern.toLowerCase();
    return normInput.includes(normPattern) || normPattern.includes(normInput);
  });
  if (substringMatch) return substringMatch;

  // 3. Fallback: Token Similarity Matching (Jaccard Overlap >= 0.65)
  let bestMatch: QABankRecord | undefined = undefined;
  let highestScore = 0;

  for (const entry of allEntries) {
    const score = computeTokenSimilarity(questionPattern, entry.question_pattern);
    if (score >= 0.65 && score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

export function upsertQABankEntry(data: {
  profile_id: string;
  question_pattern: string;
  answer: string;
  question_type?: string;
  confidence?: string;
  source?: string;
  variants?: string[];
}): QABankRecord | undefined {
  const normQ = (data.question_pattern || "").toLowerCase();
  if (normQ.includes("showing interest") || normQ.includes("kindly answer") || normQ.includes("recruiter's questions")) {
    return undefined;
  }

  const cleanSource = data.source === "ai_generated" ? "ai_generated" : "default";
  const db = getDrizzleDb();

  const existing = db
    .select()
    .from(qaBank)
    .where(and(eq(qaBank.profile_id, data.profile_id), eq(qaBank.question_pattern, data.question_pattern)))
    .get();

  if (existing) {
    db.update(qaBank)
      .set({
        answer: data.answer,
        question_type: data.question_type ?? existing.question_type,
        confidence: data.confidence ?? existing.confidence,
        source: cleanSource,
        variants: data.variants ?? existing.variants,
      })
      .where(eq(qaBank.id, existing.id))
      .run();

    return getQABankEntryById(existing.id);
  }

  const id = randomUUID();
  const newRecord: NewQABankRecord = {
    id,
    profile_id: data.profile_id,
    question_pattern: data.question_pattern,
    question_type: data.question_type ?? null,
    answer: data.answer,
    variants: data.variants ?? [],
    confidence: data.confidence ?? "high",
    source: cleanSource,
    use_count: 0,
    created_at: new Date().toISOString(),
  };

  db.insert(qaBank).values(newRecord).run();
  return getQABankEntryById(id);
}

export function incrementQAUsage(id: string): void {
  const db = getDrizzleDb();
  const existing = getQABankEntryById(id);
  if (!existing) return;

  db.update(qaBank)
    .set({
      use_count: (existing.use_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .where(eq(qaBank.id, id))
    .run();
}

export function deleteQABankEntry(id: string): void {
  getDrizzleDb().delete(qaBank).where(eq(qaBank.id, id)).run();
}

export function clearAIGeneratedQABankEntries(profileId: string): void {
  getDrizzleDb()
    .delete(qaBank)
    .where(and(eq(qaBank.profile_id, profileId), eq(qaBank.source, "ai_generated")))
    .run();
}

export function seedDefaultQABank(profileId: string): void {
  const profile = getProfileById(profileId);

  const defaultEntries = [
    { question_pattern: "Are you comfortable for alternate 6 days working?", answer: "Yes, I am comfortable with this working arrangement.", question_type: "radio" },
    { question_pattern: "Are you currently residing in or willing to relocate to office location?", answer: "Yes, I am comfortable with this working arrangement and willing to relocate.", question_type: "radio" },
    { question_pattern: "Why are you interested in joining our company?", answer: "I am excited about this role because my background and skills closely align with your requirements, and I want to contribute to the company's growth.", question_type: "textarea" },
    { question_pattern: "Are you legally authorized to work in this country?", answer: "Yes", question_type: "radio" },
    { question_pattern: "Will you now or in the future require visa sponsorship?", answer: "No", question_type: "radio" },
    { question_pattern: "What is your desired start date?", answer: "Immediate", question_type: "text" },
    { question_pattern: "What is your notice period in days?", answer: profile?.notice_period || "30 days", question_type: "text" },
    { question_pattern: "How many years of relevant work experience do you have?", answer: profile?.experience_years ? `${profile.experience_years} years` : "3+ years", question_type: "text" },
    { question_pattern: "What is your expected CTC / desired salary?", answer: "As per company standards and role responsibilities (Negotiable)", question_type: "text" },
    { question_pattern: "On a scale of 1-10, how would you rate your overall expertise?", answer: "8", question_type: "text" },
  ];

  for (const entry of defaultEntries) {
    upsertQABankEntry({
      profile_id: profileId,
      question_pattern: entry.question_pattern,
      answer: entry.answer,
      question_type: entry.question_type,
      confidence: "high",
      source: "default",
    });
  }
}
