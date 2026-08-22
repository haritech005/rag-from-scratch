import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding, buildRAGPrompt, generateLLMResponse, LLM_MODEL } from "@/lib/ollama";
import { loadEmbeddings, loadExtractedPages } from "@/lib/storage";
import { searchTopK } from "@/lib/vectorSearch";
import { ChatMessage } from "@/types";

/**
 * Phase 6, 7 & 9 API Endpoint: POST /api/query
 * 
 * 1. Accepts a user's question and optional conversation history (chatHistory).
 * 2. Constructs an enriched vector search query (combining previous user question if pronouns are present).
 * 3. Generates an embedding vector for the search query using nomic-embed-text.
 * 4. Retrieves Top-K (3) relevant chunks using Cosine Similarity against data/vectors.json.
 * 5. Constructs a grounded prompt containing system instructions, context chunks, chat history, and question.
 * 6. Sends the prompt to local Ollama gemma3:4b model to generate the final grounded response.
 * 7. Returns answer, source citations, retrieved chunks, constructed prompt, and updated chatHistory.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question?.trim();
    const topK = typeof body.topK === "number" ? body.topK : 3;
    const minScore = typeof body.minScore === "number" ? body.minScore : 0.0;
    const customPrompt = typeof body.customPrompt === "string" ? body.customPrompt : undefined;
    const chatHistory: ChatMessage[] = Array.isArray(body.chatHistory) ? body.chatHistory : [];

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

    // Step 2: Build enriched search query for vector retrieval
    // If conversation history exists, combine previous user questions with current question
    // so vector search retrieves relevant chunks even when current question uses pronouns ("Why is it useful?")
    let vectorSearchText = question;
    const previousUserMsgs = chatHistory.filter((m) => m.role === "user");
    if (previousUserMsgs.length > 0) {
      const lastUserMsg = previousUserMsgs[previousUserMsgs.length - 1].content;
      // If current question is short or contains pronouns, include last user question context
      if (
        question.length < 25 ||
        /\b(it|this|that|they|these|those|he|she)\b/i.test(question)
      ) {
        vectorSearchText = `${lastUserMsg} ${question}`;
      }
    }

    console.log(`Phase 9 & 11: Embedding search text for vector retrieval: "${vectorSearchText}"`);
    const queryVector = await generateEmbedding(vectorSearchText);

    // Step 3: Compute Cosine Similarity against all stored chunks and rank Top-K above minScore threshold
    const topChunks = searchTopK(queryVector, vectorStore.vectors, topK, minScore);

    const formattedChunks = topChunks.map((item) => ({
      chunkId: item.chunkId,
      pageNumber: item.pageNumber,
      score: parseFloat(item.score.toFixed(4)),
      content: item.content,
    }));

    // Step 4: Build grounded prompt inserting retrieved chunks, history, customPrompt and instructions
    const fullPrompt = buildRAGPrompt(question, formattedChunks, chatHistory, customPrompt);


    console.log("\n=== Phase 9 Constructed Prompt ===");
    console.log(fullPrompt);
    console.log("=================================\n");

    // Step 5: Send prompt to local Gemma 3 4B model via Ollama
    console.log(`Phase 9: Sending prompt to local model '${LLM_MODEL}'...`);
    const answer = await generateLLMResponse(fullPrompt);

    // Phase 7: Extract unique source pages to build explicit citation metadata
    const extractedDoc = await loadExtractedPages();
    const activeFilename = extractedDoc?.filename || "RAG.pdf";

    const uniquePages = Array.from(new Set(formattedChunks.map((c) => c.pageNumber))).sort(
      (a, b) => a - b
    );
    const sources = uniquePages.map((page) => ({
      file: activeFilename,
      page,
    }));

    // Step 6: Construct updated conversation history
    const updatedHistory: ChatMessage[] = [
      ...chatHistory,
      { role: "user", content: question },
      { role: "assistant", content: answer, sources },
    ];

    return NextResponse.json({
      success: true,
      question,
      modelUsed: LLM_MODEL,
      answer,
      sources,
      totalVectorsSearched: vectorStore.vectors.length,
      topK: formattedChunks.length,
      retrievedChunks: formattedChunks,
      constructedPrompt: fullPrompt,
      chatHistory: updatedHistory,
    });
  } catch (error: any) {
    console.error("Phase 9 RAG Generation Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate grounded answer from Gemma 3 4B",
      },
      { status: 500 }
    );
  }
}




