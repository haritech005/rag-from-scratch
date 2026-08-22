import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { parsePdfFile } from "@/lib/pdf";
import { chunkExtractedDocument } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/ollama";
import {
  saveExtractedPages,
  saveChunks,
  saveEmbeddings,
  saveDocumentMeta,
  DocumentMeta,
} from "@/lib/storage";
import { ExtractedDocument, ChunkedDocument, LocalVectorStore, VectorEmbedding } from "@/types";

/**
 * Endpoint 1: POST /api/upload
 * 
 * Unified Automated PDF Upload & RAG Indexing Pipeline for User-Facing UI.
 * 
 * 1. Accepts a PDF file via FormData (`file`).
 * 2. Validates PDF format, file size, and text extractability.
 * 3. Extracts text pages (Phase 1).
 * 4. Chunks text with optimal defaults (chunkSize=600, overlap=100) (Phase 2).
 * 5. Generates 768-dim embeddings via nomic-embed-text (Phase 3).
 * 6. Saves all state files into data/ and returns document status metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No PDF file provided. Please attach a file with key 'file'." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Only .pdf files are supported." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: "Uploaded file is empty (0 bytes)." },
        { status: 400 }
      );
    }

    const dataDir = path.join(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });
    const targetPath = path.join(dataDir, "uploaded_pdf.pdf");

    // Save uploaded PDF file locally
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(targetPath, buffer);

    const fileSizeFormatted = `${(file.size / (1024 * 1024)).toFixed(1)}MB`;
    console.log(`\n=== USER UPLOAD: "${file.name}" (${fileSizeFormatted}) ===`);

    // Step 1: Text Extraction (Phase 1)
    console.log("Step 1: Extracting text from PDF pages...");
    const parsedPdf = await parsePdfFile(targetPath);

    if (!parsedPdf.pages || parsedPdf.pages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to extract pages from PDF file." },
        { status: 400 }
      );
    }

    const totalExtractedText = parsedPdf.pages.map((p) => p.text).join(" ").trim();
    if (totalExtractedText.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "PDF contains no extractable text. Please upload a text-based PDF (scanned images are not supported in Vanilla RAG).",
        },
        { status: 400 }
      );
    }

    const extractedDoc: ExtractedDocument = {
      filename: file.name,
      totalPages: parsedPdf.pages.length,
      extractedAt: new Date().toISOString(),
      pages: parsedPdf.pages,
    };
    await saveExtractedPages(extractedDoc);

    // Step 2: Chunking (Phase 2 - Default: chunkSize=600, overlap=100)
    console.log("Step 2: Splitting text into 600-token chunks with 100-token overlap...");
    const chunkedDoc: ChunkedDocument = chunkExtractedDocument(extractedDoc, 600, 100);
    await saveChunks(chunkedDoc);

    // Step 3: Embeddings Generation (Phase 3 - nomic-embed-text)
    console.log(`Step 3: Generating 768-dim embeddings for ${chunkedDoc.totalChunks} chunks...`);
    const vectorEmbeddings: VectorEmbedding[] = [];

    for (let i = 0; i < chunkedDoc.chunks.length; i++) {
      const c = chunkedDoc.chunks[i];
      console.log(`  Embedding [${i + 1}/${chunkedDoc.chunks.length}] (${c.id})...`);
      const embedding = await generateEmbedding(c.content);
      vectorEmbeddings.push({
        id: c.id,
        chunkId: c.id,
        pageNumber: c.pageNumber,
        content: c.content,
        embedding,
      });
    }

    const vectorStore: LocalVectorStore = {
      filename: file.name,
      totalVectors: vectorEmbeddings.length,
      embeddingModel: "nomic-embed-text",
      dimensions: 768,
      vectors: vectorEmbeddings,
    };
    await saveEmbeddings(vectorStore);

    // Step 4: Save Document Metadata
    const docMeta: DocumentMeta = {
      filename: file.name,
      fileSize: fileSizeFormatted,
      totalPages: parsedPdf.pages.length,
      totalChunks: chunkedDoc.totalChunks,
      totalVectors: vectorEmbeddings.length,
      status: "ready",
      uploadedAt: new Date().toISOString(),
    };
    await saveDocumentMeta(docMeta);

    console.log(`✓ Upload & Indexing Complete for "${file.name}"!\n`);

    return NextResponse.json({
      success: true,
      message: "PDF uploaded and indexed successfully",
      document: docMeta,
    });
  } catch (error: any) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload and index PDF file" },
      { status: 500 }
    );
  }
}
