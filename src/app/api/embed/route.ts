import { NextResponse } from "next/server";
import { loadChunks, saveEmbeddings, loadEmbeddings } from "@/lib/storage";
import { generateEmbedding, EMBEDDING_MODEL } from "@/lib/ollama";
import { VectorEmbedding, LocalVectorStore } from "@/types";

/**
 * Phase 3 API Endpoint: POST /api/embed
 * 
 * 1. Reads text chunks generated in Phase 2 from data/chunks.json
 * 2. Sends each chunk's text to Ollama's embedding API using nomic-embed-text
 * 3. Pairs each chunk with its 768-dimensional vector embedding
 * 4. Saves the results as JSON in data/vectors.json
 */
export async function POST() {
  try {
    // Step 1: Read Phase 2 text chunks from data/chunks.json
    const chunkedDoc = await loadChunks();
    if (!chunkedDoc || !chunkedDoc.chunks || chunkedDoc.chunks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No text chunks found in data/chunks.json. Please run Phase 2 chunking first.",
        },
        { status: 400 }
      );
    }

    console.log(`Starting Phase 3: Generating embeddings for ${chunkedDoc.chunks.length} chunks...`);

    const vectors: VectorEmbedding[] = [];

    // Step 2 & 3: Iterate through each chunk and generate embedding using nomic-embed-text
    for (let i = 0; i < chunkedDoc.chunks.length; i++) {
      const chunk = chunkedDoc.chunks[i];
      
      console.log(`Embedding chunk ${i + 1}/${chunkedDoc.chunks.length} (${chunk.id})...`);
      
      const embeddingVector = await generateEmbedding(chunk.content);

      // Step 4: Store returned embedding together with chunk text & metadata
      vectors.push({
        id: chunk.id,
        chunkId: chunk.id,
        content: chunk.content,
        embedding: embeddingVector,
        pageNumber: chunk.pageNumber,
      });
    }

    const vectorStore: LocalVectorStore = {
      updatedAt: new Date().toISOString(),
      totalChunks: vectors.length,
      vectors,
    };

    // Step 5: Save result to data/vectors.json
    const savedPath = await saveEmbeddings(vectorStore);

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${vectors.length} embeddings using model '${EMBEDDING_MODEL}' (${vectors[0]?.embedding.length || 768} dimensions each).`,
      savedTo: savedPath,
      totalEmbeddings: vectors.length,
      sampleVector: {
        id: vectors[0]?.id,
        pageNumber: vectors[0]?.pageNumber,
        contentPreview: vectors[0]?.content.slice(0, 100) + "...",
        embeddingDimensions: vectors[0]?.embedding.length,
        embeddingPreview: vectors[0]?.embedding.slice(0, 5), // Show first 5 numbers as preview
      },
    });
  } catch (error: any) {
    console.error("Embedding API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate chunk embeddings",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/embed
 * Returns stored vector embeddings from data/vectors.json
 */
export async function GET() {
  const data = await loadEmbeddings();
  if (!data) {
    return NextResponse.json(
      { success: false, message: "No vector embeddings found. Run POST /api/embed first." },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data });
}
