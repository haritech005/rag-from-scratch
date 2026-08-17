import fs from "fs";
import path from "path";
import { EVAL_TEST_SET } from "../src/lib/evalDataset";

const BASE_URL = "http://localhost:3000";

async function runEvaluation() {
  console.log("\n=======================================================");
  console.log("   PHASE 10: RAG EVALUATION SUITE (10 TEST QUESTIONS)   ");
  console.log("=======================================================\n");

  const results = [];

  for (const testCase of EVAL_TEST_SET) {
    console.log(`[Q${testCase.id}/10] [${testCase.category}]`);
    console.log(`Question: "${testCase.question}"`);

    try {
      const res = await fetch(`${BASE_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: testCase.question, topK: 3 }),
      });

      const data = await res.json();
      if (!data.success) {
        console.error(`❌ Error querying RAG pipeline: ${data.error}`);
        continue;
      }

      const chunks = (data.retrievedChunks || []).map((c: any) => `[${c.chunkId} (P${c.pageNumber}, score: ${c.score})]`).join(", ");
      const answer = data.answer || "";
      const isFallback = answer.includes("not found in the document");

      console.log(`  Top Chunks: ${chunks}`);
      console.log(`  Answer    : ${answer.substring(0, 120)}...`);
      console.log(`  Fallback? : ${isFallback ? "YES (Out of Scope)" : "NO"}`);
      console.log("-------------------------------------------------------\n");

      results.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        expectedBehavior: testCase.expectedBehavior,
        retrievedChunks: data.retrievedChunks,
        answer: data.answer,
        sources: data.sources,
        isFallbackTriggered: isFallback,
      });
    } catch (err: any) {
      console.error(`❌ Fetch error for Q${testCase.id}:`, err.message);
    }
  }

  const outputPath = path.join(process.cwd(), "data", "eval_results.json");
  fs.writeFileSync(outputPath, JSON.stringify({ evaluatedAt: new Date().toISOString(), totalQuestions: results.length, results }, null, 2));

  console.log(`\n=======================================================`);
  console.log(`✓ Evaluation Complete! ${results.length}/10 Questions Processed.`);
  console.log(`✓ Structured Results Saved to: data/eval_results.json`);
  console.log(`=======================================================\n`);
}

runEvaluation();
