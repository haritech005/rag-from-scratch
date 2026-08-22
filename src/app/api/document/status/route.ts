import { NextResponse } from "next/server";
import { loadDocumentMeta } from "@/lib/storage";

/**
 * Endpoint 3: GET /api/document/status
 * 
 * Returns the status and metadata of the active indexed PDF.
 */
export async function GET() {
  try {
    const meta = await loadDocumentMeta();
    if (!meta) {
      return NextResponse.json({
        success: true,
        hasDocument: false,
        document: null,
      });
    }

    return NextResponse.json({
      success: true,
      hasDocument: true,
      document: meta,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch document status" },
      { status: 500 }
    );
  }
}
