/**
 * Indeed Platform Applier using Playwright.
 *
 * Delegates to FormAutomationEngine with IndeedApplyStrategy.
 */

import type { Page } from "playwright";
import type { PlatformApplier, ApplicationExecuteOptions, ApplicationExecuteResult } from "../types";
import { FormAutomationEngine, IndeedApplyStrategy } from "../engine";

export class IndeedApplier implements PlatformApplier {
  readonly platformId = "indeed";
  private readonly formEngine = new FormAutomationEngine({ maxSteps: 8 });
  private readonly strategy = new IndeedApplyStrategy();

  async apply(page: Page, options: ApplicationExecuteOptions): Promise<ApplicationExecuteResult> {
    return await this.formEngine.execute(page, this.strategy, options);
  }
}
