import { put, del } from "@vercel/blob";
import { nanoid } from "nanoid";

/**
 * Thin wrapper over Vercel Blob storage.
 *
 * Blobs are namespaced per workspace under `workspaces/<workspaceId>/` so a
 * workspace's files are easy to reason about and isolate. The SDK reads
 * BLOB_READ_WRITE_TOKEN from the environment automatically.
 */

/**
 * Make a user-supplied filename safe for use in a blob pathname: drop any path
 * separators, collapse anything that isn't a word char/dot/dash to "_", and
 * cap the length. Falls back to "file" if nothing usable remains.
 */
function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name; // strip directory parts
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "_") // weird chars → underscore
    .replace(/^[._]+/, "") // no leading dots/underscores
    .slice(0, 200);
  return cleaned || "file";
}

/**
 * Upload a File to blob storage under the workspace namespace.
 * `addRandomSuffix: false` because we already prefix with a nanoid for
 * uniqueness, keeping the human-readable filename intact and predictable.
 */
export async function uploadFileToBlob({
  workspaceId,
  projectId,
  file,
}: {
  workspaceId: string;
  projectId: string;
  file: File;
}): Promise<{ url: string; pathname: string }> {
  const pathname = `workspaces/${workspaceId}/${projectId}/${nanoid()}-${sanitizeFilename(
    file.name,
  )}`;

  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
  });

  return { url: blob.url, pathname: blob.pathname };
}

/**
 * Delete a blob by its public URL. Best-effort: failures are logged but never
 * thrown so a missing/already-deleted blob can't break the calling request
 * (the DB row is the source of truth).
 */
export async function deleteFileFromBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (err) {
    console.error("Failed to delete blob:", url, err);
  }
}
