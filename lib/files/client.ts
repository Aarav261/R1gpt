import type { FileRecord } from "@/lib/db/schema";

/**
 * Browser-side fetch helpers for the workspace files API. Plain functions (no
 * React) so any client component or hook can call them. Each throws an Error
 * carrying the server's message on a non-2xx response.
 */

/** Pull the best available error message out of a failed JSON response. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") return body.error;
  } catch {
    // non-JSON body — fall through to the generic message.
  }
  return fallback;
}

/**
 * Upload a file to a workspace. Returns the created FileRecord.
 * `documentType`, when given, should be a DocumentType string value.
 */
export async function uploadWorkspaceFile(
  workspaceId: string,
  projectId: string,
  file: File,
  documentType?: string,
): Promise<FileRecord> {
  const form = new FormData();
  form.append("file", file);
  form.append("projectId", projectId);
  if (documentType) form.append("documentType", documentType);

  const res = await fetch(`/api/workspaces/${workspaceId}/files`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Upload failed."));
  }
  return res.json() as Promise<FileRecord>;
}

/** List a project's files, newest first. */
export async function listWorkspaceFiles(
  workspaceId: string,
  projectId: string,
): Promise<FileRecord[]> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/files?projectId=${encodeURIComponent(projectId)}`,
    { method: "GET" },
  );

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Failed to load files."));
  }
  return res.json() as Promise<FileRecord[]>;
}

/** Delete a file from a workspace. */
export async function deleteWorkspaceFile(
  workspaceId: string,
  fileId: string,
): Promise<void> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/files/${fileId}`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Failed to delete file."));
  }
}
