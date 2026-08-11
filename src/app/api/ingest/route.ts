import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { parsePdfFile } from "@/lib/pdf";
import { saveExtractedPages, loadExtractedPages } from "@/lib/storage";

/**
 * Phase 1 API Endpoint: POST /api/ingest
 * 
 * Extracts text page-by-page from RAG.pdf (or an uploaded file)
 * and stores the extracted JSON object in data/extracted_pages.json.
 */
export async function POST(request: NextRequest) {
  try {
    let pdfPath = path.join(process.cwd(), "RAG.pdf");

    // Check if request contains a file upload (multipart/form-data)
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempPath = path.join(process.cwd(), "data", file.name || "uploaded.pdf");
        fs.writeFileSync(tempPath, buffer);
        pdfPath = tempPath;
      }
    }

    // Step 1 & 2 & 3: Parse PDF and extract page-by-page text with page numbers
    const extractedDocument = await parsePdfFile(pdfPath);

    // Step 4: Save extracted document data structure into data/extracted_pages.json
    const savedPath = await saveExtractedPages(extractedDocument);

    return NextResponse.json({
      success: true,
      message: `Successfully extracted ${extractedDocument.totalPages} pages from ${extractedDocument.filename}`,
      savedTo: savedPath,
      document: extractedDocument,
    });
  } catch (error: any) {
    console.error("PDF Extraction Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to extract text from PDF",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ingest
 * Returns previously extracted JSON data if available.
 */
export async function GET() {
  const data = await loadExtractedPages();
  if (!data) {
    return NextResponse.json(
      { success: false, message: "No extracted PDF data found. Run POST /api/ingest first." },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, document: data });
}
