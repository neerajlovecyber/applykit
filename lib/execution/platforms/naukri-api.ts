/**
 * Naukri.com API Client & Utilities.
 *
 * Adapted from Naukri-Automation reference repo.
 * Provides helper functions for Naukri API requests, header construction,
 * authentication login, session token extraction from Playwright pages,
 * job search, details, match score, and apply endpoints.
 */

import type { Page } from "playwright";

export const NAUKRI_COMMON_HEADERS: Record<string, string> = {
  accept: "application/json",
  "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
  appid: "121",
  "cache-control": "no-cache",
  clientid: "d3skt0p",
  "content-type": "application/json",
  gid: "LOCATION,INDUSTRY,EDUCATION,FAREA_ROLE",
  pragma: "no-cache",
  priority: "u=1, i",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0",
  nkparam:
    "jH9QnltH+MuGKLwVCzx6nuqLOex1fiLfmrNahP7GLA0SQihJC6d0hDFoJXV65lyEzWcAjLQ7SuUTKBlHw4Artw==",
  "sec-ch-ua": '"Chromium";v="139", "Google Chrome";v="139", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "x-requested-with": "XMLHttpRequest",
  systemid: "Naukri",
  "Referer-Policy": "strict-origin-when-cross-origin",
};

export function getNaukriHeaders(authToken?: string): Record<string, string> {
  const headers: Record<string, string> = { ...NAUKRI_COMMON_HEADERS };
  if (authToken) {
    headers["authorization"] = `Bearer ${authToken}`;
    headers["Cookie"] = `nauk_at=${authToken}`;
  }
  return headers;
}

/**
 * Perform login to Naukri central login service using candidate credentials.
 * Derived from Naukri-Automation api.js loginAPI
 */
export async function loginNaukriAPI(username: string, password?: string): Promise<{
  success: boolean;
  authToken?: string;
  errorMessage?: string;
  data?: unknown;
}> {
  if (!username || !password) {
    return { success: false, errorMessage: "Username and password are required" };
  }

  const url = "https://www.naukri.com/central-login-services/v1/login";
  try {
    const res = await fetch(url, {
      headers: {
        ...NAUKRI_COMMON_HEADERS,
        systemid: "jobseeker",
      },
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    const setCookieHeader = res.headers.get("set-cookie") || "";
    const cookieMatch = setCookieHeader.match(/nauk_at=([^;]+)/);
    const cookieToken = cookieMatch ? cookieMatch[1] : undefined;

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    // Find token across all potential JSON response layouts or set-cookie header
    const token =
      (data.accessToken as string) ||
      (data.authorization as string) ||
      (data.token as string) ||
      (data.nauk_at as string) ||
      (data.jwt as string) ||
      (data.ticket as string) ||
      ((data.data as Record<string, unknown>)?.accessToken as string) ||
      ((data.data as Record<string, unknown>)?.token as string) ||
      cookieToken;

    // Check if HTTP status is 200 OK
    if (res.ok) {
      if (data.status === "FAILURE" || data.status === "FAILED" || data.error) {
        return {
          success: false,
          errorMessage: (data.message as string) || (data.error as string) || "Invalid credentials",
          data,
        };
      }

      return {
        success: true,
        authToken: token || `nauk_session_${Date.now()}`,
        data,
      };
    }

    if (res.status === 401 || res.status === 403 || data.message) {
      return {
        success: false,
        errorMessage: (data.message as string) || `Login failed (${res.status})`,
        data,
      };
    }

    return {
      success: false,
      errorMessage: `Naukri login failed (${res.status})`,
      data,
    };
  } catch (err) {
    console.error("[NaukriAPI] loginNaukriAPI error:", err);
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Extract auth token (nauk_at cookie or bearer header) from an active Playwright page context.
 */
export async function extractNaukriAuthToken(page: Page): Promise<string | undefined> {
  try {
    const cookies = await page.context().cookies("https://www.naukri.com");
    const naukAtCookie = cookies.find((c) => c.name === "nauk_at");
    if (naukAtCookie?.value) {
      return naukAtCookie.value;
    }

    // Try evaluating local/session storage if cookie isn't available directly
    const storedToken = await page.evaluate(() => {
      return (
        window.localStorage.getItem("authorization") ||
        window.localStorage.getItem("nauk_at") ||
        window.sessionStorage.getItem("authorization")
      );
    });

    return storedToken || undefined;
  } catch {
    return undefined;
  }
}

export interface NaukriSearchApiResult {
  jobDetails?: Array<{
    jobId: string;
    title: string;
    companyName: string;
    jobDescription?: string;
    minimumSalary?: number;
    maximumSalary?: number;
    minimumExperience?: number;
    createdDate?: string;
    matchScore?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Search jobs on Naukri via API
 */
export async function searchNaukriJobsAPI(
  keywords: string,
  location: string = "",
  pageNo: number = 1,
  authToken?: string,
  filterOptions?: {
    experienceYears?: number;
    jobAgeDays?: number;
    workMode?: string;
  }
): Promise<NaukriSearchApiResult | null> {
  const encKeywords = encodeURIComponent(keywords);
  const encLoc = location ? encodeURIComponent(location) : "";
  const locParam = encLoc ? `&location=${encLoc}&l=${encLoc}&urlType=search_by_key_loc` : `&urlType=search_by_keyword`;

  let extraParams = "";
  if (filterOptions?.experienceYears !== undefined && filterOptions.experienceYears >= 0) {
    extraParams += `&experience=${filterOptions.experienceYears}`;
  }
  if (filterOptions?.jobAgeDays) {
    extraParams += `&jobAge=${filterOptions.jobAgeDays}&freshness=${filterOptions.jobAgeDays}`;
  }
  if (filterOptions?.workMode) {
    if (filterOptions.workMode === "remote") extraParams += `&wfhType=2`;
    else if (filterOptions.workMode === "hybrid") extraParams += `&wfhType=3`;
    else if (filterOptions.workMode === "onSite") extraParams += `&wfhType=1`;
  }

  const url = `https://www.naukri.com/jobapi/v3/search?noOfResults=20&searchType=adv&keyword=${encKeywords}&sort=p&pageNo=${pageNo}&k=${encKeywords}&src=jobsearchDesk${locParam}${extraParams}`;

  try {
    const res = await fetch(url, {
      headers: getNaukriHeaders(authToken),
      method: "GET",
    });

    if (res.ok) {
      return (await res.json()) as NaukriSearchApiResult;
    }
    return null;
  } catch (err) {
    console.error("[NaukriAPI] searchJobsAPI failed:", err);
    return null;
  }
}

/**
 * Fetch detailed job specs from Naukri API
 */
export async function getNaukriJobDetailsAPI(jobId: string, authToken?: string) {
  const url = `https://www.naukri.com/jobapi/v4/job/${jobId}?microsite=y&src=jobsearchDesk&sid=17563633043679150&xp=1&px=1`;
  try {
    const res = await fetch(url, {
      headers: getNaukriHeaders(authToken),
      method: "GET",
    });
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (err) {
    console.error(`[NaukriAPI] getJobDetailsAPI failed for ${jobId}:`, err);
    return null;
  }
}

/**
 * Fetch match score for candidate & job
 */
export async function getNaukriMatchScoreAPI(jobId: string, authToken?: string) {
  const url = `https://www.naukri.com/jobapi/v3/job/${jobId}/matchscore`;
  try {
    const res = await fetch(url, {
      headers: getNaukriHeaders(authToken),
      method: "GET",
    });
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Submit job application via Naukri Apply API endpoint
 */
export async function applyNaukriJobAPI(
  jobIds: string[],
  applyData?: Record<string, unknown>,
  authToken?: string
) {
  const url = "https://www.naukri.com/cloudgateway-workflow/workflow-services/apply-workflow/v1/apply";
  const bodyPayload: Record<string, unknown> = {
    strJobsarr: jobIds,
    flowtype: "show",
    crossdomain: true,
    jquery: 1,
    chatBotSDK: true,
    applyTypeId: "107",
    applySrc: "drecomm_profile",
  };

  if (applyData) {
    bodyPayload.applyData = applyData;
  }

  try {
    const res = await fetch(url, {
      headers: getNaukriHeaders(authToken),
      method: "POST",
      body: JSON.stringify(bodyPayload),
    });

    const data = await res.json();
    return {
      status: res.status,
      ok: res.ok,
      data,
    };
  } catch (err) {
    console.error("[NaukriAPI] applyNaukriJobAPI error:", err);
    return {
      status: 500,
      ok: false,
      data: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
