import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDrizzleDb } from "../index";
import { automationPlans, type AutomationPlanRecord, type NewAutomationPlanRecord } from "../schema";

export function getAutomationPlans(profileId?: string): AutomationPlanRecord[] {
  const db = getDrizzleDb();
  if (profileId) {
    return db
      .select()
      .from(automationPlans)
      .where(eq(automationPlans.profile_id, profileId))
      .orderBy(desc(automationPlans.created_at))
      .all();
  }
  return db.select().from(automationPlans).orderBy(desc(automationPlans.created_at)).all();
}

export function getAutomationPlanById(id: string): AutomationPlanRecord | undefined {
  return getDrizzleDb().select().from(automationPlans).where(eq(automationPlans.id, id)).get();
}

export function createAutomationPlan(data: {
  profile_id: string;
  name: string;
  steps: string;
  auto_apply?: number;
  min_match_score?: number;
  max_applies_per_run?: number;
  run_interval_hours?: number;
}): AutomationPlanRecord {
  const id = randomUUID();
  const db = getDrizzleDb();

  const newRecord: NewAutomationPlanRecord = {
    id,
    profile_id: data.profile_id,
    name: data.name,
    steps: data.steps,
    auto_apply: data.auto_apply ?? 0,
    min_match_score: data.min_match_score ?? 0.7,
    max_applies_per_run: data.max_applies_per_run ?? 10,
    enabled: 1,
    run_interval_hours: data.run_interval_hours ?? 24,
    total_runs: 0,
    total_applied: 0,
    created_at: new Date().toISOString(),
  };

  db.insert(automationPlans).values(newRecord).run();
  return getAutomationPlanById(id)!;
}

export function updateAutomationPlan(
  id: string,
  data: Partial<NewAutomationPlanRecord>
): AutomationPlanRecord | undefined {
  const db = getDrizzleDb();
  db.update(automationPlans).set(data).where(eq(automationPlans.id, id)).run();
  return getAutomationPlanById(id);
}

export function recordAutomationRun(id: string, appliedCount: number): void {
  const plan = getAutomationPlanById(id);
  if (!plan) return;

  getDrizzleDb()
    .update(automationPlans)
    .set({
      total_runs: (plan.total_runs || 0) + 1,
      total_applied: (plan.total_applied || 0) + appliedCount,
      last_run_at: new Date().toISOString(),
    })
    .where(eq(automationPlans.id, id))
    .run();
}

export function deleteAutomationPlan(id: string): void {
  getDrizzleDb().delete(automationPlans).where(eq(automationPlans.id, id)).run();
}
