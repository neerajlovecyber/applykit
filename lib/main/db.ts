import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = join(app.getPath("userData"), "applykit.db");
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initTables(db);
  runMigrations(db);
  return db;
}

function initTables(db: Database.Database): void {
  db.exec(`
    -- ════════════════════════════════════════════════════════════
    -- PROFILES: User profiles with full personal & preference data
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS profiles (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      -- Personal Info
      full_name         TEXT,
      email             TEXT,
      phone             TEXT,
      location          TEXT,
      linkedin_url      TEXT,
      portfolio_url     TEXT,
      -- Professional Summary
      summary           TEXT,
      skills            TEXT DEFAULT '[]',
      experience_years  INTEGER,
      seniority         TEXT DEFAULT 'mid',
      -- Job Preferences
      target_titles     TEXT DEFAULT '[]',
      target_locations  TEXT DEFAULT '[]',
      work_mode         TEXT DEFAULT 'any',
      salary_min        INTEGER,
      salary_max        INTEGER,
      salary_currency   TEXT DEFAULT 'INR',
      target_industries TEXT DEFAULT '[]',
      -- Search Filters
      exclude_companies TEXT DEFAULT '[]',
      exclude_keywords  TEXT DEFAULT '[]',
      min_company_size  TEXT,
      visa_required     INTEGER DEFAULT 0,
      -- Resume & Documents
      resume_path       TEXT,
      resume_data       TEXT,
      resume_parsed     TEXT,
      cover_letter_template TEXT,
      -- Default Answers
      default_answers   TEXT DEFAULT '{}',
      -- Meta
      is_active         INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    );

    -- ════════════════════════════════════════════════════════════
    -- QA BANK: Learned question-answer pairs
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS qa_bank (
      id                TEXT PRIMARY KEY,
      profile_id        TEXT NOT NULL,
      question_pattern  TEXT NOT NULL,
      question_type     TEXT,
      answer            TEXT NOT NULL,
      variants          TEXT DEFAULT '[]',
      confidence        TEXT DEFAULT 'high',
      source            TEXT DEFAULT 'manual',
      use_count         INTEGER DEFAULT 0,
      last_used_at      TEXT,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_qa_bank_profile ON qa_bank(profile_id);
    CREATE INDEX IF NOT EXISTS idx_qa_bank_pattern ON qa_bank(question_pattern);

    -- ════════════════════════════════════════════════════════════
    -- JOB POSTINGS: Discovered & tracked jobs
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS job_postings (
      id                TEXT PRIMARY KEY,
      source            TEXT NOT NULL,
      source_id         TEXT NOT NULL,
      title             TEXT NOT NULL,
      company           TEXT NOT NULL,
      location          TEXT,
      employment_type   TEXT,
      seniority         TEXT,
      description       TEXT,
      requirements      TEXT,
      salary_info       TEXT,
      application_url   TEXT,
      company_url       TEXT,
      -- Scoring
      match_score       REAL,
      match_breakdown   TEXT,
      match_explanation TEXT,
      -- State
      state             TEXT DEFAULT 'new',
      -- Tracking
      discovered_at     TEXT DEFAULT (datetime('now')),
      last_seen_at      TEXT DEFAULT (datetime('now')),
      expires_at        TEXT,
      -- Raw
      raw_data          TEXT,
      content_hash      TEXT,
      UNIQUE(source, source_id)
    );

    CREATE INDEX IF NOT EXISTS idx_job_postings_state ON job_postings(state);
    CREATE INDEX IF NOT EXISTS idx_job_postings_company ON job_postings(company);
    CREATE INDEX IF NOT EXISTS idx_job_postings_score ON job_postings(match_score DESC);
    CREATE INDEX IF NOT EXISTS idx_job_postings_discovered ON job_postings(discovered_at DESC);
    CREATE INDEX IF NOT EXISTS idx_job_postings_source ON job_postings(source, source_id);

    -- ════════════════════════════════════════════════════════════
    -- APPLICATIONS: Submission tracking
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS applications (
      id                TEXT PRIMARY KEY,
      job_id            TEXT NOT NULL,
      profile_id        TEXT NOT NULL,
      status            TEXT DEFAULT 'pending_review',
      -- Materials
      resume_version    TEXT,
      cover_letter      TEXT,
      qa_responses      TEXT,
      -- Fill details
      fields_filled     INTEGER,
      fields_total      INTEGER,
      fill_details      TEXT,
      screenshot_path   TEXT,
      -- Outcome
      outcome           TEXT,
      outcome_note      TEXT,
      outcome_updated_at TEXT,
      -- Audit
      state_history     TEXT DEFAULT '[]',
      error_log         TEXT,
      -- Timestamps
      created_at        TEXT DEFAULT (datetime('now')),
      submitted_at      TEXT,
      updated_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES job_postings(id),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_applications_outcome ON applications(outcome);

    -- ════════════════════════════════════════════════════════════
    -- SEARCH QUERIES: Saved searches
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS search_queries (
      id                TEXT PRIMARY KEY,
      profile_id        TEXT NOT NULL,
      source            TEXT NOT NULL,
      keywords          TEXT NOT NULL,
      location          TEXT,
      filters           TEXT DEFAULT '{}',
      status            TEXT DEFAULT 'active',
      last_run_at       TEXT,
      last_success_at   TEXT,
      result_count      INTEGER DEFAULT 0,
      max_pages         INTEGER DEFAULT 3,
      run_interval_hours INTEGER DEFAULT 24,
      next_run_at       TEXT,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_search_queries_profile ON search_queries(profile_id);
    CREATE INDEX IF NOT EXISTS idx_search_queries_status ON search_queries(status);

    -- ════════════════════════════════════════════════════════════
    -- PLATFORMS: Login state for each platform
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS platforms (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      status            TEXT DEFAULT 'disconnected',
      cookies           TEXT,
      auth_token        TEXT,
      connected_at      TEXT,
      last_checked_at   TEXT,
      expires_at        TEXT,
      error_message     TEXT,
      daily_limit       INTEGER,
      applied_today     INTEGER DEFAULT 0,
      limit_reset_at    TEXT
    );

    -- ════════════════════════════════════════════════════════════
    -- TASKS: Background task queue
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS tasks (
      id                TEXT PRIMARY KEY,
      kind              TEXT NOT NULL,
      status            TEXT DEFAULT 'queued',
      payload           TEXT,
      result            TEXT,
      error             TEXT,
      attempts          INTEGER DEFAULT 0,
      max_attempts      INTEGER DEFAULT 3,
      job_id            TEXT,
      application_id    TEXT,
      parent_task_id    TEXT,
      scheduled_for     TEXT DEFAULT (datetime('now')),
      started_at        TEXT,
      finished_at       TEXT,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE SET NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_tasks_kind ON tasks(kind);

    -- ════════════════════════════════════════════════════════════
    -- DOCUMENTS: Resume & cover letter library
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS documents (
      id                TEXT PRIMARY KEY,
      profile_id        TEXT NOT NULL,
      doc_type          TEXT NOT NULL,
      display_name      TEXT NOT NULL,
      file_path         TEXT NOT NULL,
      file_format       TEXT,
      extracted_text    TEXT,
      parsed_structure  TEXT,
      checksum          TEXT,
      size_bytes        INTEGER,
      origin            TEXT DEFAULT 'uploaded',
      source_job_id     TEXT,
      is_default        INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_profile ON documents(profile_id);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);

    -- ════════════════════════════════════════════════════════════
    -- SETTINGS: Key-value app settings
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS settings (
      key               TEXT PRIMARY KEY,
      value             TEXT
    );

    -- ════════════════════════════════════════════════════════════
    -- AUTOMATION PLANS: Scheduled automation workflows
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS automation_plans (
      id                TEXT PRIMARY KEY,
      profile_id        TEXT NOT NULL,
      name              TEXT NOT NULL,
      steps             TEXT NOT NULL,
      auto_apply        INTEGER DEFAULT 0,
      min_match_score   REAL DEFAULT 0.7,
      max_applies_per_run INTEGER DEFAULT 10,
      enabled           INTEGER DEFAULT 1,
      run_interval_hours INTEGER DEFAULT 24,
      last_run_at       TEXT,
      next_run_at       TEXT,
      total_runs        INTEGER DEFAULT 0,
      total_applied     INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_automation_plans_profile ON automation_plans(profile_id);

    -- ════════════════════════════════════════════════════════════
    -- LEGACY COMPAT: Keep old 'jobs' and 'history' tables for backward compat
    -- ════════════════════════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT,
      url TEXT NOT NULL,
      platform TEXT,
      status TEXT DEFAULT 'queued',
      profile_id TEXT,
      error_message TEXT,
      added_at TEXT DEFAULT (datetime('now')),
      applied_at TEXT,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      title TEXT,
      company TEXT,
      platform TEXT,
      url TEXT,
      profile_id TEXT,
      profile_name TEXT,
      status TEXT,
      error_message TEXT,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default platform entries if they don't exist
  const platformInsert = db.prepare(
    "INSERT OR IGNORE INTO platforms (id, name) VALUES (?, ?)",
  );
  const defaultPlatforms = [
    ["linkedin", "LinkedIn"],
    ["naukri", "Naukri"],
    ["indeed", "Indeed"],
    ["lever", "Lever"],
    ["greenhouse", "Greenhouse"],
    ["workday", "Workday"],
  ];
  for (const [id, name] of defaultPlatforms) {
    platformInsert.run(id, name);
  }

  // ── Cleanup legacy emojis from profile names in SQLite ──
  db.exec(`UPDATE profiles SET name = REPLACE(REPLACE(name, '🚀 ', ''), '🔐 ', '') WHERE name LIKE '%🚀%' OR name LIKE '%🔐%';`);

  // ── Seed Neeraj's profiles (INSERT OR IGNORE — safe to re-run, never overwrites edits) ──
  const seedProfile = db.prepare(`
    INSERT OR IGNORE INTO profiles (
      id, name, full_name, email, phone, location, linkedin_url,
      summary, skills, experience_years, seniority,
      target_titles, target_locations, work_mode,
      salary_min, salary_max, salary_currency,
      resume_data, resume_parsed, default_answers, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const devopsSkills = JSON.stringify([
    "AWS", "Linux Administration", "CI/CD Pipelines", "GitHub Actions",
    "Docker", "Kubernetes", "Terraform", "Ansible", "Infrastructure Automation",
    "Release Validation", "Deployment Workflows", "Configuration Baselines",
    "Health Checks", "Environment Provisioning", "ELK/OpenSearch",
    "Centralized Logging", "Monitoring", "Python Scripting", "Shell Scripting",
    "Postman", "Jira", "Wazuh"
  ]);
  const devopsResumeParsed = JSON.stringify({
    personalInfo: { name: "Neeraj Singh", title: "DevOps Engineer", email: "neerajlovecyber@gmail.com", phone: "+91 7988815263", location: "Delhi NCR, India", linkedin: "linkedin.com/in/neerajlovecyber" },
    summary: "DevOps Engineer with 2+ years of combined professional and internship experience building reliable cloud, automation, and release workflows across AWS, Linux, CI/CD, and containerized environments. Strong in GitHub Actions, Docker, Kubernetes, Terraform, Ansible, scripting, centralized logging, monitoring, and deployment validation. Experienced in adding security-aware checks and operational visibility to delivery pipelines.",
    workExperience: [
      { id: 1, title: "DevOps Engineer", company: "xIoTz Private Limited", location: "Remote, Delhi NCR", years: "Nov 2024 - Present", description: ["Co-designed and operated a cyber assurance platform on AWS EC2, improving operational visibility for 10 cloud workloads through provisioning, logging, monitoring, and deployment controls.", "Built reproducible Windows/Linux deployment workflows, reducing setup drift through scripted health checks, configuration baselines, and repeatable environment controls.", "Automated operational response workflows with Wazuh Active Response, reducing manual remediation steps and improving consistency across distributed workloads.", "Built workflows for asset discovery, baseline checks, evidence collection, and remediation tracking; documented findings and partnered with engineers."] },
      { id: 2, title: "DevOps & CI/CD Intern", company: "Frugal Testing", location: "Hyderabad, India", years: "2023 - 2024", description: ["Implemented GitHub Actions pipelines with repeatable checks and release validation, reducing manual deployment overhead by 30%.", "Containerized test environments with Docker and automated distributed execution on Kubernetes, enabling parallel test runs and improving validation consistency by 30%.", "Programmed web/API validation with Java, Selenium, and Postman; collaborated in Jira and shipped Slack alerts for faster failure visibility."] }
    ],
    personalProjects: [
      { id: 1, name: "Cyber Assurance Platform", role: "Cloud Operations & Observability Layer", years: "2024 - Present", description: ["Developed an AWS-based operations plane for centralized logging, workload telemetry, retention, event queues, and release visibility using Docker, Valkey/Redis, and ELK/OpenSearch."] },
      { id: 2, name: "WatchTower Security Scanner", role: "Automated Domain Audit Tool", description: ["Built a scanner that collects DNS, TLS, HTTP headers, WAF, open-port, WHOIS, blocklist, vendor, and threat-signal data with exportable findings."] },
      { id: 3, name: "Security Audit360", role: "Baseline & Audit Console", description: ["Developed an audit application for 40+ digital asset signals including DNS, domains, public IPs, and SSL/TLS certificates; generated baseline reports for operations review."] }
    ],
    education: [{ id: 1, institution: "Lovely Professional University", degree: "B.Tech Computer Science and Engineering", years: "Aug 2020 - Oct 2024", description: "CGPA 8.29" }],
    additional: {
      technicalSkills: ["AWS", "Linux", "Docker", "Kubernetes", "Terraform", "Ansible", "GitHub Actions", "ELK/OpenSearch", "Wazuh", "Python", "Shell Scripting", "Postman", "Jira"],
      certificationsTraining: ["Certified Ethical Hacker (CEH) - EC-Council", "Jr. Penetration Tester (eJPT) - eLearnSecurity", "AWS & DevOps Fundamentals - KodeKloud"]
    }
  });

  const cyberSkills = JSON.stringify([
    "Wazuh SIEM", "SOC Triage", "Incident Response", "Threat Containment",
    "Vulnerability Assessment", "Log Analysis", "Security Auditing",
    "DNS/TLS Security", "Linux Hardening", "Web/API Security Validation",
    "Security Baselines", "Remediation Tracking", "Risk Reporting",
    "ELK/OpenSearch", "YARA", "Python Scripting", "Shell Scripting",
    "Burp Suite", "Nmap", "Postman", "Incident Documentation"
  ]);
  const cyberResumeParsed = JSON.stringify({
    personalInfo: { name: "Neeraj Singh", title: "Cybersecurity Engineer", email: "neerajlovecyber@gmail.com", phone: "+91 7988815263", location: "Delhi NCR, India", linkedin: "linkedin.com/in/neerajlovecyber" },
    summary: "Cybersecurity Engineer with 2+ years of combined professional and internship experience in threat detection, SOC triage, vulnerability assessment, incident response, and cloud security monitoring. Strong in Wazuh SIEM, log analysis, threat containment, DNS/TLS security, Linux hardening, web/API security validation, and remediation tracking.",
    workExperience: [
      { id: 1, title: "Security Engineer", company: "xIoTz Private Limited", location: "Remote, Delhi NCR", years: "Nov 2024 - Present", description: ["Co-designed a cyber assurance platform, improving visibility for 10 cloud workloads through Wazuh monitoring, log centralization, and alerting.", "Built Windows/Linux security baselines with scripted health checks, configuration validation, and repeatable controls to reduce drift.", "Created custom Wazuh Active Response modules to automate containment, isolation, and remediation while reducing manual response steps.", "Built workflows for asset discovery, baseline checks, evidence collection, and remediation tracking."] },
      { id: 2, title: "Security Testing & Automation Intern", company: "Frugal Testing", location: "Hyderabad, India", years: "2023 - 2024", description: ["Built repeatable web/API validation checks for authentication flows, API behavior, and regression risk, reducing manual verification by 30%.", "Used isolated environments to validate security-sensitive web/API changes, enabling parallel runs and improving consistency by 30%.", "Programmed web/API checks with Java, Selenium, and Postman; tracked security-relevant defects in Jira."] }
    ],
    personalProjects: [
      { id: 1, name: "Cyber Assurance Platform", role: "Unified SOC & Cloud Security Layer", years: "2024 - Present", description: ["Developed a security operations plane for detection, triage, centralized logging, cloud posture checks, workload telemetry, and retention using Wazuh and ELK/OpenSearch."] },
      { id: 2, name: "WatchTower Security Scanner", role: "Domain Risk Scorecard", description: ["Built a scanner for DNS, TLS, HTTP headers, WAF exposure, open ports, WHOIS, blocklists, and threat signals; generates grades, scores, and findings."] },
      { id: 3, name: "Security Audit360", role: "Baseline & Audit Console", description: ["Developed an audit app for 40+ digital asset signals including DNS, domains, IPs, and SSL/TLS certificates; generated baseline risk reports."] }
    ],
    education: [{ id: 1, institution: "Lovely Professional University", degree: "B.Tech Computer Science and Engineering", years: "Aug 2020 - Oct 2024", description: "CGPA 8.29" }],
    additional: {
      technicalSkills: ["Wazuh", "ELK/OpenSearch", "YARA", "Burp Suite", "Nmap", "Python", "Shell Scripting", "Linux", "Postman", "Docker"],
      certificationsTraining: ["Certified Ethical Hacker (CEH) - EC-Council", "Jr. Penetration Tester (eJPT) - eLearnSecurity", "AWS Cloud Security Fundamentals - KodeKloud"]
    }
  });

  // DevOps profile (active by default)
  seedProfile.run(
    "neeraj-devops-001",
    "DevOps Engineer",
    "Neeraj Singh",
    "neerajlovecyber@gmail.com",
    "+91 7988815263",
    "Delhi NCR, India",
    "linkedin.com/in/neerajlovecyber",
    "DevOps Engineer with 2+ years of experience building cloud, automation, and release workflows across AWS, Linux, CI/CD, and containerized environments.",
    devopsSkills,
    2,
    "mid",
    JSON.stringify(["DevOps Engineer", "DevSecOps Engineer", "SRE", "Cloud Engineer", "Platform Engineer"]),
    JSON.stringify(["Delhi NCR", "Remote", "Bengaluru", "Hyderabad"]),
    "remote",
    600000, 1800000, "INR",
    null,
    devopsResumeParsed,
    JSON.stringify({ "years of experience": "2", "notice period": "immediate", "current ctc": "fresher", "expected ctc": "negotiable" }),
    1, // is_active
  );

  // Cybersecurity profile (inactive — switch to it from Role Profiles)
  seedProfile.run(
    "neeraj-cyber-001",
    "Cybersecurity Engineer",
    "Neeraj Singh",
    "neerajlovecyber@gmail.com",
    "+91 7988815263",
    "Delhi NCR, India",
    "linkedin.com/in/neerajlovecyber",
    "Cybersecurity Engineer with 2+ years of experience in threat detection, SOC triage, vulnerability assessment, incident response, and cloud security monitoring.",
    cyberSkills,
    2,
    "mid",
    JSON.stringify(["Security Engineer", "SOC Analyst", "Cybersecurity Analyst", "Penetration Tester", "DevSecOps Engineer"]),
    JSON.stringify(["Delhi NCR", "Remote", "Bengaluru", "Hyderabad"]),
    "remote",
    600000, 1800000, "INR",
    null,
    cyberResumeParsed,
    JSON.stringify({ "years of experience": "2", "notice period": "immediate", "current ctc": "fresher", "expected ctc": "negotiable" }),
    0, // is_active
  );
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ════════════════════════════════════════════════════════════
// DATABASE MIGRATIONS ENGINE
// ════════════════════════════════════════════════════════════

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial_schema_baseline",
    up: (_db) => {
      // Baseline migration - table structure created by initTables
    },
  },
  {
    version: 2,
    name: "add_human_action_state_support",
    up: (db) => {
      // Future column or index additions for task queue or application states
      db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_job ON tasks(job_id);`);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const appliedVersions = new Set<number>(
    (db.prepare("SELECT version FROM schema_migrations").all() as { version: number }[]).map(
      (row) => row.version,
    ),
  );

  const insertMigration = db.prepare(
    "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
  );

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      const applyTx = db.transaction(() => {
        migration.up(db);
        insertMigration.run(migration.version, migration.name);
      });
      applyTx();
    }
  }
}

