import { NextRequest, NextResponse } from "next/server";
import { loadExtractedPages, saveChunks, loadChunks, saveExtractedPages } from "@/lib/storage";
import { chunkExtractedDocument } from "@/lib/chunker";
import { parsePdfFile } from "@/lib/pdf";
import path from "path";

/**
 * Phase 2 API Endpoint: POST /api/chunk & GET /api/chunk
 * 
 * - POST: Loads extracted pages from data/extracted_pages.json (or extracts if missing),
 *         splits text into overlapping chunks, and stores the output in data/chunks.json.
 * - GET: Returns previously generated chunk data from data/chunks.json.
 */

export async function POST(request: NextRequest) {
  try {
    let { chunkSize = 600, overlap = 100 } = {};

    try {
      const body = await request.json();
      if (body.chunkSize) chunkSize = Number(body.chunkSize);
      if (body.overlap !== undefined) overlap = Number(body.overlap);
    } catch {
      // Body is optional
    }

    // Step 1: Load extracted pages from Phase 1
    let extractedDoc = await loadExtractedPages();

    // If Phase 1 extraction hasn't been run yet, extract RAG.pdf automatically
    if (!extractedDoc) {
      const pdfPath = path.join(process.cwd(), "RAG.pdf");
      extractedDoc = await parsePdfFile(pdfPath);
      await saveExtractedPages(extractedDoc);
    }

    // Step 2: Perform sliding window text chunking
    const chunkedDocument = chunkExtractedDocument(extractedDoc, chunkSize, overlap);

    // Step 3: Save chunked document to data/chunks.json
    const savedPath = await saveChunks(chunkedDocument);

    return NextResponse.json({
      success: true,
      message: `Successfully created ${chunkedDocument.totalChunks} chunks (Size: ~${chunkSize} tokens, Overlap: ~${overlap} tokens)`,
      savedTo: savedPath,
      data: chunkedDocument,
    });
  } catch (error: any) {
    console.error("Chunking API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to chunk document text",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const data = await loadChunks();
  if (!data) {
    return NextResponse.json(
      { success: false, message: "No text chunks found. Run POST /api/chunk first." },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data });
}
