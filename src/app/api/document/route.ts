import { NextResponse } from "next/server";
import { resetActiveDocument, loadDocumentMeta } from "@/lib/storage";

/**
 * Endpoint 4: DELETE /api/document & GET /api/document
 * 
 * - DELETE: Clears the active PDF file, extracted pages, chunks, and vector store.
 * - GET: Returns document metadata.
 */
export async function DELETE() {
  try {
    await resetActiveDocument();
    return NextResponse.json({
      success: true,
      message: "Active document reset successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset active document" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const meta = await loadDocumentMeta();
    return NextResponse.json({
      success: true,
      hasDocument: !!meta,
      document: meta,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch document" },
      { status: 500 }
    );
  }
}
