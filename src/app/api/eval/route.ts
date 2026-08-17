import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { EVAL_TEST_SET } from "@/lib/evalDataset";

export interface EvalResultItem {
  id: number;
  question: string;
  category: string;
  expectedBehavior: string;
  retrievedChunks: {
    chunkId: string;
    pageNumber: number;
    score: number;
  }[];
  generatedAnswer: string;
  sources: { file: string; page: number }[];
  isFallbackTriggered: boolean;
}

export interface EvalSummaryReport {
  evaluatedAt: string;
  totalQuestions: number;
  results: EvalResultItem[];
}

/**
 * Phase 10 API Endpoint: POST /api/eval (or GET /api/eval)
 * 
 * Runs the 10 evaluation test questions against the RAG pipeline.
 * Records retrieved chunk IDs, page numbers, similarity scores, and LLM answers.
 * Saves structured result in data/eval_results.json.
 */
export async function POST(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin;
    const results: EvalResultItem[] = [];

    console.log(`Phase 10: Starting RAG Evaluation Suite (${EVAL_TEST_SET.length} questions)...`);

    for (const testCase of EVAL_TEST_SET) {
      console.log(`Evaluating [Q${testCase.id}/${EVAL_TEST_SET.length}] (${testCase.category}): "${testCase.question}"`);

      const queryRes = await fetch(`${origin}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: testCase.question, topK: 3 }),
      });

      const queryData = await queryRes.json();
      if (!queryData.success) {
        throw new Error(`Failed to query RAG pipeline for Q${testCase.id}: ${queryData.error}`);
      }

      const answerText = queryData.answer || "";
      const isFallback = answerText.includes("not found in the document");

      results.push({
        id: testCase.id,
        question: testCase.question,
        category: testCase.category,
        expectedBehavior: testCase.expectedBehavior,
        retrievedChunks: (queryData.retrievedChunks || []).map((c: any) => ({
          chunkId: c.chunkId,
          pageNumber: c.pageNumber,
          score: c.score,
        })),
        generatedAnswer: answerText,
        sources: queryData.sources || [],
        isFallbackTriggered: isFallback,
      });
    }

    const report: EvalSummaryReport = {
      evaluatedAt: new Date().toISOString(),
      totalQuestions: results.length,
      results,
    };

    // Save report to data/eval_results.json
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const outputPath = path.join(dataDir, "eval_results.json");
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");

    console.log(`Phase 10: Evaluation finished! Output saved to ${outputPath}`);

    return NextResponse.json({
      success: true,
      report,
      savedTo: "data/eval_results.json",
    });
  } catch (error: any) {
    console.error("Phase 10 Evaluation Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute Phase 10 evaluation suite",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/eval
 * Returns saved evaluation report if available.
 */
export async function GET() {
  const outputPath = path.join(process.cwd(), "data", "eval_results.json");
  if (!fs.existsSync(outputPath)) {
    return NextResponse.json(
      { success: false, message: "No evaluation report found. Run POST /api/eval first." },
      { status: 404 }
    );
  }
  const raw = fs.readFileSync(outputPath, "utf-8");
  return NextResponse.json({ success: true, report: JSON.parse(raw) });
}
