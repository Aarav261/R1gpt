import { NextResponse } from "next/server";
import { guardError, requireCan } from "@/lib/auth/guard";
import { deleteFileFromBlob } from "@/lib/files/blob";
import { deleteFileRecord, getFile } from "@/lib/files/queries";

export const dynamic = "force-dynamic";

type Params = { params: { workspaceId: string; fileId: string } };

/**
 * DELETE — remove a file (requires the 'upload' capability; viewers blocked).
 *
 * The file must belong to this workspace (404 otherwise) so a member of one
 * workspace can't delete another's file by guessing an id. The DB row is
 * removed first, then the blob is best-effort deleted.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const g = await requireCan(params.workspaceId, "upload");
  if (!g.ok) return guardError(g);

  const file = await getFile(params.fileId);
  if (!file || file.workspaceId !== params.workspaceId) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const deleted = await deleteFileRecord(params.fileId);
  // If another request already removed the row, treat as not found.
  if (!deleted) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  await deleteFileFromBlob(deleted.storageUrl);

  return NextResponse.json({ ok: true });
}
