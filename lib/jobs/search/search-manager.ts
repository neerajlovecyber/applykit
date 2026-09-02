/**
 * Unified Search Manager Facade.
 *
 * Delegates to the deep JobDiscoveryService while maintaining
 * backwards compatibility for existing callers.
 */

import type { SearchOptions, SearchRunResult } from "../types";
import { discoveryService } from "../discovery-service";

export type { SearchRunResult };

/**
 * Execute job discovery across target source using the deep discovery service.
 */
export async function executeSearch(options: SearchOptions, queryId?: string): Promise<SearchRunResult> {
  return discoveryService.executeSearch(options, queryId);
}
