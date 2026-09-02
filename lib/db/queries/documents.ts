import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDrizzleDb } from "../index";
import { documents, type DocumentRecord, type NewDocumentRecord } from "../schema";

export function getDocuments(profileId?: string, docType?: string): DocumentRecord[] {
  const db = getDrizzleDb();
  if (profileId && docType) {
    return db
      .select()
      .from(documents)
      .where(and(eq(documents.profile_id, profileId), eq(documents.doc_type, docType)))
      .orderBy(desc(documents.created_at))
      .all();
  }
  if (profileId) {
    return db
      .select()
      .from(documents)
      .where(eq(documents.profile_id, profileId))
      .orderBy(desc(documents.created_at))
      .all();
  }
  if (docType) {
    return db
      .select()
      .from(documents)
      .where(eq(documents.doc_type, docType))
      .orderBy(desc(documents.created_at))
      .all();
  }
  return db.select().from(documents).orderBy(desc(documents.created_at)).all();
}

export function getDocumentById(id: string): DocumentRecord | undefined {
  return getDrizzleDb().select().from(documents).where(eq(documents.id, id)).get();
}

export function createDocument(data: {
  profile_id: string;
  doc_type: string;
  display_name: string;
  file_path: string;
  file_format?: string;
  extracted_text?: string;
  parsed_structure?: string;
  checksum?: string;
  size_bytes?: number;
  origin?: string;
  source_job_id?: string;
  is_default?: number;
}): DocumentRecord {
  const id = randomUUID();
  const db = getDrizzleDb();

  const newRecord: NewDocumentRecord = {
    id,
    profile_id: data.profile_id,
    doc_type: data.doc_type,
    display_name: data.display_name,
    file_path: data.file_path,
    file_format: data.file_format ?? null,
    extracted_text: data.extracted_text ?? null,
    parsed_structure: data.parsed_structure ?? null,
    checksum: data.checksum ?? null,
    size_bytes: data.size_bytes ?? null,
    origin: data.origin ?? "uploaded",
    source_job_id: data.source_job_id ?? null,
    is_default: data.is_default ?? 0,
    created_at: new Date().toISOString(),
  };

  db.insert(documents).values(newRecord).run();
  return getDocumentById(id)!;
}

export function insertDocument(data: {
  profile_id: string;
  name?: string;
  display_name?: string;
  type?: string;
  doc_type?: string;
  file_path?: string;
  content_text?: string;
  extracted_text?: string;
  is_primary?: boolean;
  is_default?: number;
  [key: string]: any;
}): DocumentRecord {
  return createDocument({
    profile_id: data.profile_id,
    doc_type: data.doc_type || data.type || "resume",
    display_name: data.display_name || data.name || "Document",
    file_path: data.file_path || "",
    extracted_text: data.extracted_text || data.content_text,
    is_default: data.is_default !== undefined ? data.is_default : (data.is_primary ? 1 : 0),
  });
}

export function deleteDocument(id: string): void {
  getDrizzleDb().delete(documents).where(eq(documents.id, id)).run();
}
