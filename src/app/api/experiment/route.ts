import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { EVAL_TEST_SET } from "@/lib/evalDataset";

export interface ExperimentConfig {
  name: string;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  minScore: number;
  customPrompt?: string;
}

export interface ExperimentResult {
  experimentName: string;
  config: ExperimentConfig;
  executedAt: string;
  totalQuestions: number;
  totalChunksInStore: number;
  avgSimilarityScore: number;
  fallbackCount: number;
  results: {
    id: number;
    question: string;
    category: string;
    retrievedChunks: { chunkId: string; pageNumber: number; score: number }[];
    answer: string;
    isFallback: boolean;
  }[];
}

/**
 * Phase 11 API Endpoint: POST /api/experiment
 * 
 * Runs a custom or preset RAG hyperparameter experiment:
 * 1. Re-chunks document with custom chunkSize and chunkOverlap.
 * 2. Generates 768-dim embeddings with nomic-embed-text.
 * 3. Evaluates all 10 test questions with custom topK, minScore, and customPrompt.
 * 4. Saves results into data/experiments.json.
 */
export async function POST(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin;
    const body = await request.json();

    const config: ExperimentConfig = {
      name: body.name || "Custom Experiment",
      chunkSize: Number(body.chunkSize) || 600,
      chunkOverlap: Number(body.chunkOverlap) !== undefined ? Number(body.chunkOverlap) : 100,
      topK: Number(body.topK) || 3,
      minScore: Number(body.minScore) || 0.0,
      customPrompt: body.customPrompt || undefined,
    };

    console.log(`\n=======================================================`);
    console.log(`  PHASE 11 EXPERIMENT: ${config.name.toUpperCase()}`);
    console.log(`  Config: chunkSize=${config.chunkSize}, overlap=${config.chunkOverlap}, topK=${config.topK}, minScore=${config.minScore}`);
    console.log(`=======================================================\n`);

    // Step 1: Re-chunk text with experiment chunkSize and chunkOverlap
    console.log("Phase 11: Re-chunking document text...");
    const chunkRes = await fetch(`${origin}/api/chunk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunkSize: config.chunkSize, overlap: config.chunkOverlap }),
    });
    const chunkData = await chunkRes.json();
    if (!chunkData.success) {
      throw new Error(`Chunking failed: ${chunkData.error}`);
    }

    // Step 2: Generate embeddings with nomic-embed-text
    console.log("Phase 11: Re-generating vector embeddings with Ollama...");
    const embedRes = await fetch(`${origin}/api/embed`, { method: "POST" });
    const embedData = await embedRes.json();
    if (!embedData.success) {
      throw new Error(`Embedding failed: ${embedData.error}`);
    }

    // Step 3: Run evaluation suite against custom hyperparameter configuration
    const results = [];
    let totalScoreSum = 0;
    let scoreCount = 0;
    let fallbackCount = 0;

    for (const testCase of EVAL_TEST_SET) {
      console.log(`Experimenting [Q${testCase.id}/10] (${testCase.category}): "${testCase.question}"`);

      const queryRes = await fetch(`${origin}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: testCase.question,
          topK: config.topK,
          minScore: config.minScore,
          customPrompt: config.customPrompt,
        }),
      });

      const queryData = await queryRes.json();
      if (!queryData.success) {
        throw new Error(`Query error for Q${testCase.id}: ${queryData.error}`);
      }

      const answerText = queryData.answer || "";
      const isFallback = answerText.includes("not found in the document");
      if (isFallback) fallbackCount++;

      const retrieved = (queryData.retrievedChunks || []).map((c: any) => {
        totalScoreSum += c.score;
        scoreCount++;
        return {
          chunkId: c.chunkId,
          pageNumber: c.pageNumber,
          score: c.score,
        };
      });

      results.push({
        id: testCase.id,
        question: testCase.question,
        category: testCase.category,
        retrievedChunks: retrieved,
        answer: answerText,
        isFallback,
      });
    }

    const avgScore = scoreCount > 0 ? parseFloat((totalScoreSum / scoreCount).toFixed(4)) : 0;

    const experimentResult: ExperimentResult = {
      experimentName: config.name,
      config,
      executedAt: new Date().toISOString(),
      totalQuestions: results.length,
      totalChunksInStore: chunkData.data?.totalChunks || 0,
      avgSimilarityScore: avgScore,
      fallbackCount,
      results,
    };

    // Save to data/experiments.json (maintaining list of past experiments)
    const dataDir = path.join(process.cwd(), "data");
    const expFilePath = path.join(dataDir, "experiments.json");

    let pastExperiments: ExperimentResult[] = [];
    if (fs.existsSync(expFilePath)) {
      try {
        pastExperiments = JSON.parse(fs.readFileSync(expFilePath, "utf-8"));
      } catch {
        pastExperiments = [];
      }
    }

    // Filter out previous experiment with same name or prepend new result
    pastExperiments = [experimentResult, ...pastExperiments.filter((e) => e.experimentName !== config.name)];
    fs.writeFileSync(expFilePath, JSON.stringify(pastExperiments, null, 2), "utf-8");

    console.log(`\n✓ Experiment '${config.name}' completed successfully! Saved to data/experiments.json\n`);

    return NextResponse.json({
      success: true,
      experiment: experimentResult,
      savedTo: "data/experiments.json",
    });
  } catch (error: any) {
    console.error("Phase 11 Experiment Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute Phase 11 experiment",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/experiment
 * Returns past experiments comparison report from data/experiments.json.
 */
export async function GET() {
  const expFilePath = path.join(process.cwd(), "data", "experiments.json");
  if (!fs.existsSync(expFilePath)) {
    return NextResponse.json({ success: true, experiments: [] });
  }
  const raw = fs.readFileSync(expFilePath, "utf-8");
  return NextResponse.json({ success: true, experiments: JSON.parse(raw) });
}
