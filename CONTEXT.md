# ApplyKit

Desktop AI co-pilot and browser automation engine for job discovery, tailoring, and application submissions.

## Language

**Profile**:
A candidate's stored identity including contact info, parsed resume sections, skills, and target job preferences.
_Avoid_: User, account, candidate profile

**Job Posting**:
A job opening discovered from an external platform or input URL with raw details, parsed attributes, and match score.
_Avoid_: Job, listing, lead, vacancy

**Application**:
The stateful record of submitting a profile to a specific job posting, including field mappings, status, and outcome.
_Avoid_: Submission, apply task, job application

**Task**:
An asynchronous unit of work executed by the worker supervisor, such as browser automation, search, or LLM evaluation.
_Avoid_: Job, background job, operation

**Platform**:
An external job board or ATS portal (e.g. LinkedIn, Naukri, Indeed, Lever, Greenhouse) with credentials and connection status.
_Avoid_: Source, vendor, target

**QA Bank**:
A candidate-specific library of learned question-answer pairs used to automatically fill custom ATS application questions.
_Avoid_: Q&A store, answer bank, question cache

**Document**:
A stored resume, cover letter, or generated artifact associated with a profile and optionally tailored to a job posting.
_Avoid_: File, resume attachment
