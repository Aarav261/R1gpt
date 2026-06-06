// PDF text extraction. pdf-parse accepts a Buffer and returns { text }.
// Plain-text fixtures saved with a .pdf extension are handled gracefully by
// falling back to a UTF-8 decode when the buffer is not a real PDF.

export async function parsePdf(buffer: Buffer): Promise<string> {
  const isPdf = buffer.subarray(0, 5).toString("latin1") === "%PDF-";

  if (!isPdf) {
    // Synthetic fixtures and plain-text uploads.
    return buffer.toString("utf-8");
  }

  // Lazy import so the dependency is only loaded inside the API route runtime.
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer);
  return result.text;
}
