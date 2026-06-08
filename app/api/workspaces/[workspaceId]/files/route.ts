import { NextResponse } from "next/server";
import { guardError, requireCan, requireMembership } from "@/lib/auth/guard";
import { uploadFileToBlob } from "@/lib/files/blob";
import { createFileRecord, listFiles } from "@/lib/files/queries";
import { getProjectById } from "@/lib/projects/queries";
import { DocumentType } from "@/types/documents";

export const dynamic = "force-dynamic";

type Params = { params: { workspaceId: string } };

// 50 MB ceiling — generous for PDFs/reports while rejecting obvious abuse.
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Permissive allow-list of mime types the app ingests. PDFs plus the office
// formats engineering docs commonly arrive in. Empty mime types are rejected.
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

// Valid DocumentType string values, for validating the optional form field.
const DOCUMENT_TYPES = new Set<string>(Object.values(DocumentType));

/** Confirm the project exists and belongs to the gated workspace. */
async function resolveProject(workspaceId: string, projectId: string | null) {
  if (!projectId) return null;
  const project = await getProjectById(projectId);
  if (!project || project.workspaceId !== workspaceId) return null;
  return project;
}

/** GET — list a project's files (any member can view). Requires `projectId`. */
export async function GET(req: Request, { params }: Params) {
  const g = await requireMembership(params.workspaceId, "viewer");
  if (!g.ok) return guardError(g);

  const projectId = new URL(req.url).searchParams.get("projectId");
  const project = await resolveProject(params.workspaceId, projectId);
  if (!project) {
    return NextResponse.json(
      { error: "A valid projectId is required." },
      { status: 400 },
    );
  }

  const records = await listFiles(project.id);
  return NextResponse.json(records);
}

/**
 * POST — upload a file (requires the 'upload' capability; viewers are blocked).
 *
 * Body is multipart/form-data with:
 *  - `file`         (required) the File to upload.
 *  - `projectId`    (required) the owning project.
 *  - `documentType` (optional) a DocumentType string value.
 */
export async function POST(request: Request, { params }: Params) {
  const g = await requireCan(params.workspaceId, "upload");
  if (!g.ok) return guardError(g);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  const project = await resolveProject(
    params.workspaceId,
    typeof form.get("projectId") === "string"
      ? (form.get("projectId") as string)
      : null,
  );
  if (!project) {
    return NextResponse.json(
      { error: "A valid projectId is required." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A file is required." },
      { status: 400 },
    );
  }

  // Reject empty / oversized uploads.
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds the 50 MB limit." },
      { status: 400 },
    );
  }

  // Validate mime type (permissive allow-list).
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}.` },
      { status: 400 },
    );
  }

  // Optional documentType must match a known DocumentType value when present.
  const rawDocType = form.get("documentType");
  let documentType: string | null = null;
  if (typeof rawDocType === "string" && rawDocType.length > 0) {
    if (!DOCUMENT_TYPES.has(rawDocType)) {
      return NextResponse.json(
        { error: `Invalid document type: ${rawDocType}.` },
        { status: 400 },
      );
    }
    documentType = rawDocType;
  }

  // Persist to blob storage, then record it in the database.
  const { url, pathname } = await uploadFileToBlob({
    workspaceId: params.workspaceId,
    projectId: project.id,
    file,
  });

  const record = await createFileRecord({
    workspaceId: params.workspaceId,
    projectId: project.id,
    uploadedBy: g.user.id,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    storageUrl: url,
    pathname,
    documentType,
  });

  return NextResponse.json(record, { status: 201 });
}
