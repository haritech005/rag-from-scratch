import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/ollama";
import { loadEmbeddings } from "@/lib/storage";
import { searchTopK } from "@/lib/vectorSearch";

/**
 * Phase 5 API Endpoint: POST /api/query
 * 
 * 1. Accepts a user's question.
 * 2. Generates an embedding vector for the question using local Ollama nomic-embed-text.
 * 3. Loads chunk vectors stored in data/vectors.json.
 * 4. Calculates Cosine Similarity between question vector and every stored chunk vector.
 * 5. Returns the Top 3 (or Top-K) most relevant chunks with similarity scores and page numbers.
 * 6. (Does NOT call Gemma or perform final LLM response generation yet).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question?.trim();
    const topK = typeof body.topK === "number" ? body.topK : 3;

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question string is required" },
        { status: 400 }
      );
    }

    // Step 1: Load stored vector embeddings from data/vectors.json
    const vectorStore = await loadEmbeddings();
    if (!vectorStore || !vectorStore.vectors || vectorStore.vectors.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No vector embeddings found in data/vectors.json. Please run Phase 3 embeddings generation first.",
        },
        { status: 400 }
      );
    }

    // Step 2: Generate embedding vector for the user's question using nomic-embed-text
    console.log(`Phase 5: Generating embedding for user question: "${question}"`);
    const queryVector = await generateEmbedding(question);

    // Step 3: Compute Cosine Similarity against all stored chunks and rank Top-K
    const topChunks = searchTopK(queryVector, vectorStore.vectors, topK);

    // Debugging print as required by prompt
    console.log("\n=== Phase 5 Debugging output ===");
    console.log(`Question: "${question}"`);
    console.log(`Total Stored Chunks Searched: ${vectorStore.vectors.length}`);
    console.log(`Top ${topK} Retrieved Chunks:`);
    topChunks.forEach((item, index) => {
      console.log(`  [${index + 1}] ID: ${item.chunkId} | Page: ${item.pageNumber} | Score: ${item.score.toFixed(4)}`);
      console.log(`      Snippet: ${item.content.slice(0, 120)}...`);
    });
    console.log("=================================\n");

    return NextResponse.json({
      success: true,
      question,
      totalVectorsSearched: vectorStore.vectors.length,
      topK: topChunks.length,
      retrievedChunks: topChunks.map((item) => ({
        chunkId: item.chunkId,
        pageNumber: item.pageNumber,
        score: parseFloat(item.score.toFixed(4)),
        content: item.content,
      })),
    });
  } catch (error: any) {
    console.error("Vector Similarity Search Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to perform vector similarity search",
      },
      { status: 500 }
    );
  }
}

