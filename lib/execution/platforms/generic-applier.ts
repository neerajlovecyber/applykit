/**
 * Generic ATS Form Applier (Lever, Greenhouse, Workday, etc.).
 *
 * Delegates to FormAutomationEngine with GenericApplyStrategy.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormAutomationEngine, GenericApplyStrategy } from "../engine";

export class GenericApplier implements PlatformApplier {
  readonly platformId = "generic";
  private readonly formEngine = new FormAutomationEngine({ maxSteps: 5 });
  private readonly strategy = new GenericApplyStrategy("generic");

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    return await this.formEngine.execute(page, this.strategy, options);
  }
}
