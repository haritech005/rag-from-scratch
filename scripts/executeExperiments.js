const EXPERIMENTS = [
  {
    name: "Experiment A (Baseline)",
    chunkSize: 500,
    chunkOverlap: 100,
    topK: 3,
    minScore: 0.0,
    description: "Smaller chunks (500 tokens), Top-K=3, no similarity threshold."
  },
  {
    name: "Experiment B (High Recall)",
    chunkSize: 800,
    chunkOverlap: 150,
    topK: 5,
    minScore: 0.0,
    description: "Larger chunks (800 tokens), Top-K=5 for higher context recall."
  },
  {
    name: "Experiment C (High Precision Threshold)",
    chunkSize: 600,
    chunkOverlap: 100,
    topK: 5,
    minScore: 0.65,
    description: "Medium chunks (600 tokens), Top-K=5, minScore=0.65 similarity threshold."
  }
];

async function run() {
  console.log("\n=======================================================");
  console.log("    PHASE 11: RAG QUALITY EXPERIMENTATION SUITE        ");
  console.log("=======================================================\n");

  const summary = [];

  for (const exp of EXPERIMENTS) {
    console.log(`\n>>> Executing ${exp.name}...`);
    console.log(`    ${exp.description}`);

    try {
      const res = await fetch("http://localhost:3000/api/experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exp)
      });

      const data = await res.json();
      if (!data.success) {
        console.error(`❌ Failed: ${data.error}`);
        continue;
      }

      const result = data.experiment;
      console.log(`    ✓ Total Chunks Generated : ${result.totalChunksInStore}`);
      console.log(`    ✓ Avg Similarity Score   : ${result.avgSimilarityScore}`);
      console.log(`    ✓ Fallbacks (Out of Scope): ${result.fallbackCount}/10`);

      summary.push({
        name: exp.name,
        chunkSize: exp.config.chunkSize,
        overlap: exp.config.chunkOverlap,
        topK: exp.config.topK,
        minScore: exp.config.minScore,
        totalChunks: result.totalChunksInStore,
        avgSimilarityScore: result.avgSimilarityScore,
        fallbackCount: result.fallbackCount
      });
    } catch (err) {
      console.error(`❌ Error running ${exp.name}:`, err.message);
    }
  }

  console.log("\n=======================================================");
  console.log("             EXPERIMENT COMPARISON SUMMARY             ");
  console.log("=======================================================");
  console.table(summary);
  console.log("=======================================================\n");
}

run();
