import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding, buildRAGPrompt, generateLLMResponse, LLM_MODEL } from "@/lib/ollama";
import { loadEmbeddings } from "@/lib/storage";
import { searchTopK } from "@/lib/vectorSearch";

/**
 * Phase 6 API Endpoint: POST /api/query
 * 
 * 1. Accepts a user's question.
 * 2. Generates an embedding vector for the question using nomic-embed-text.
 * 3. Retrieves Top-K (3) relevant chunks using Cosine Similarity against data/vectors.json.
 * 4. Constructs a grounded prompt containing system instructions, context chunks with page numbers, and question.
 * 5. Sends the prompt to local Ollama gemma3:4b model to generate the final grounded response.
 * 6. Returns the generated answer, retrieved source chunks, and constructed prompt.
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
    console.log(`Phase 6: Generating embedding for user question: "${question}"`);
    const queryVector = await generateEmbedding(question);

    // Step 3: Compute Cosine Similarity against all stored chunks and rank Top-K
    const topChunks = searchTopK(queryVector, vectorStore.vectors, topK);

    const formattedChunks = topChunks.map((item) => ({
      chunkId: item.chunkId,
      pageNumber: item.pageNumber,
      score: parseFloat(item.score.toFixed(4)),
      content: item.content,
    }));

    // Step 4: Build grounded prompt inserting retrieved chunks and instructions
    const fullPrompt = buildRAGPrompt(question, formattedChunks);

    console.log("\n=== Phase 6 & 7 Constructed Prompt ===");
    console.log(fullPrompt);
    console.log("=================================\n");

    // Step 5: Send prompt to local Gemma 3 4B model via Ollama
    console.log(`Phase 6 & 7: Sending prompt to local model '${LLM_MODEL}'...`);
    const answer = await generateLLMResponse(fullPrompt);

    // Phase 7: Extract unique source pages to build explicit citation metadata
    const uniquePages = Array.from(new Set(formattedChunks.map((c) => c.pageNumber))).sort(
      (a, b) => a - b
    );
    const sources = uniquePages.map((page) => ({
      file: "RAG.pdf",
      page,
    }));

    return NextResponse.json({
      success: true,
      question,
      modelUsed: LLM_MODEL,
      answer,
      sources, // Phase 7: Explicit source citations [{ file, page }]
      totalVectorsSearched: vectorStore.vectors.length,
      topK: formattedChunks.length,
      retrievedChunks: formattedChunks,
      constructedPrompt: fullPrompt,
    });
  } catch (error: any) {
    console.error("Phase 6 & 7 RAG Generation Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate grounded answer from Gemma 3 4B",
      },
      { status: 500 }
    );
  }
}



