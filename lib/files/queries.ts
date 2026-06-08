import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, type FileRecord } from "@/lib/db/schema";

/**
 * Pure data-access layer for workspace files.
 *
 * Like lib/workspaces/queries, these functions perform NO auth checks — route
 * handlers gate access via lib/auth/guard before calling in.
 */

/** Insert a file record and return the created row. */
export async function createFileRecord({
  workspaceId,
  projectId,
  uploadedBy,
  name,
  size,
  mimeType,
  storageUrl,
  pathname,
  documentType,
}: {
  workspaceId: string;
  projectId: string;
  uploadedBy: string;
  name: string;
  size: number;
  mimeType: string;
  storageUrl: string;
  pathname: string;
  documentType?: string | null;
}): Promise<FileRecord> {
  const [row] = await db
    .insert(files)
    .values({
      workspaceId,
      projectId,
      uploadedBy,
      name,
      size,
      mimeType,
      storageUrl,
      pathname,
      documentType: documentType ?? null,
    })
    .returning();
  return row;
}

/** All files in a project, newest first. */
export async function listFiles(projectId: string): Promise<FileRecord[]> {
  return db
    .select()
    .from(files)
    .where(eq(files.projectId, projectId))
    .orderBy(desc(files.createdAt));
}

/** Look up a single file by id, or null. */
export async function getFile(fileId: string): Promise<FileRecord | null> {
  const [row] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  return row ?? null;
}

/**
 * Delete a file row and return the deleted record, so the caller can clean up
 * the underlying blob using the returned storageUrl.
 */
export async function deleteFileRecord(
  fileId: string,
): Promise<FileRecord | null> {
  const [row] = await db
    .delete(files)
    .where(eq(files.id, fileId))
    .returning();
  return row ?? null;
}
