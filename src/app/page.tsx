"use client";

import React, { useState, useEffect, useRef } from "react";
import { ExtractedDocument, ChunkedDocument, TextChunk, LocalVectorStore } from "@/types";

export default function Home() {
  // Application Data States
  const [extractedData, setExtractedData] = useState<ExtractedDocument | null>(null);
  const [chunkData, setChunkData] = useState<ChunkedDocument | null>(null);
  const [embedData, setEmbedData] = useState<LocalVectorStore | null>(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pipeline Loading States
  const [isProcessingPipeline, setIsProcessingPipeline] = useState<boolean>(false);
  const [pipelineStep, setPipelineStep] = useState<string>("");
  
  // Q&A Query States
  const [question, setQuestion] = useState<string>("What are the main paradigms of RAG?");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState<boolean>(false);
  const [answer, setAnswer] = useState<string>("");
  const [sources, setSources] = useState<{ file: string; page: number }[] | null>(null);
  const [retrievedChunks, setRetrievedChunks] = useState<
    { chunkId: string; pageNumber: number; score: number; content: string }[] | null
  >(null);
  const [constructedPrompt, setConstructedPrompt] = useState<string>("");
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [showDebugInspector, setShowDebugInspector] = useState<boolean>(false);

  // Error States
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Load existing RAG state on mount
  useEffect(() => {
    loadAppState();
  }, []);

  const loadAppState = async () => {
    try {
      // 1. Check extracted PDF pages
      const resIngest = await fetch("/api/ingest");
      const dataIngest = await resIngest.json();
      if (dataIngest.success && dataIngest.document) {
        setExtractedData(dataIngest.document);
      }

      // 2. Check text chunks
      const resChunk = await fetch("/api/chunk");
      const dataChunk = await resChunk.json();
      if (dataChunk.success && dataChunk.data) {
        setChunkData(dataChunk.data);
      }

      // 3. Check vector embeddings
      const resEmbed = await fetch("/api/embed");
      const dataEmbed = await resEmbed.json();
      if (dataEmbed.success && dataEmbed.data) {
        setEmbedData(dataEmbed.data);
      }
    } catch (err: any) {
      console.error("Error loading app state:", err);
    }
  };

  /**
   * Runs complete PDF Processing Pipeline:
   * Upload PDF -> Parse Pages (Phase 1) -> Chunk Text (Phase 2) -> Generate Embeddings (Phase 3)
   */
  const handleProcessPdfPipeline = async (fileToUpload?: File | null) => {
    setIsProcessingPipeline(true);
    setErrorMessage("");
    try {
      // Step 1: PDF Extraction (Phase 1)
      setPipelineStep("Step 1/3: Extracting PDF pages...");
      let ingestRes;
      if (fileToUpload) {
        const formData = new FormData();
        formData.append("file", fileToUpload);
        ingestRes = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });
      } else {
        ingestRes = await fetch("/api/ingest", { method: "POST" });
      }

      const dataIngest = await ingestRes.json();
      if (!dataIngest.success) {
        throw new Error(dataIngest.error || "Failed to extract text from PDF");
      }
      setExtractedData(dataIngest.document);

      // Step 2: Text Chunking (Phase 2)
      setPipelineStep("Step 2/3: Chunking document text (~600 tokens)...");
      const chunkRes = await fetch("/api/chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunkSize: 600, overlap: 100 }),
      });
      const dataChunk = await chunkRes.json();
      if (!dataChunk.success) {
        throw new Error(dataChunk.error || "Failed to generate text chunks");
      }
      setChunkData(dataChunk.data);

      // Step 3: Embeddings Generation (Phase 3)
      setPipelineStep("Step 3/3: Generating 768-dim embeddings with Ollama (nomic-embed-text)...");
      const embedRes = await fetch("/api/embed", { method: "POST" });
      const dataEmbed = await embedRes.json();
      if (!dataEmbed.success) {
        throw new Error(dataEmbed.error || "Failed to generate vector embeddings");
      }

      // Reload updated embeddings
      const getEmbed = await fetch("/api/embed");
      const dataGetEmbed = await getEmbed.json();
      if (dataGetEmbed.success) {
        setEmbedData(dataGetEmbed.data);
      }

      setPipelineStep("✓ PDF Processed & Indexed Successfully!");
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during PDF processing");
      setPipelineStep("");
    } finally {
      setIsProcessingPipeline(false);
    }
  };

  /**
   * Submits Question to RAG Query Pipeline:
   * Embed Question -> Vector Search -> Prompt Construction -> Gemma 3 4B Answer
   */
  const handleAskQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setIsGeneratingAnswer(true);
    setErrorMessage("");
    setAnswer("");
    setSources(null);
    setRetrievedChunks(null);
    setConstructedPrompt("");

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), topK: 3 }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to generate response from RAG system");
      }

      setAnswer(data.answer);
      setSources(data.sources || null);
      setRetrievedChunks(data.retrievedChunks || null);
      setConstructedPrompt(data.constructedPrompt || "");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to retrieve answer from LLM");
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  return (
    <div className="container">
      {/* HEADER SECTION */}
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
            <span className="badge">Phase 8 Frontend UI</span>
            <span className="badge badge-success">Local Ollama Active</span>
          </div>
          <h1 style={{ fontSize: "2rem", color: "#0f172a" }}>Local PDF RAG Assistant</h1>
          <p style={{ color: "#64748b", margin: 0 }}>
            Grounded Q&A powered by <code>nomic-embed-text</code> & <code>gemma3:4b</code> without external vector databases.
          </p>
        </div>

        {/* DOCUMENT METRICS CARD */}
        <div style={{ background: "#ffffff", padding: "0.8rem 1.2rem", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "var(--shadow-sm)", fontSize: "0.85rem" }}>
          <div style={{ color: "#64748b" }}>Active Document: <strong style={{ color: "#0f172a" }}>{extractedData?.filename || "RAG.pdf"}</strong></div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.3rem" }}>
            <span>📄 Pages: <strong>{extractedData?.totalPages || 0}</strong></span>
            <span>🧩 Chunks: <strong>{chunkData?.totalChunks || 0}</strong></span>
            <span>⚡ Vectors: <strong>{embedData?.totalChunks || 0}</strong></span>
          </div>
        </div>
      </header>

      {/* ERROR ALERT BANNER */}
      {errorMessage && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "1rem 1.25rem", borderRadius: "10px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Error:</strong> {errorMessage}
          </div>
          <button onClick={() => setErrorMessage("")} style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* PDF UPLOAD & PROCESS CARD */}
      <section className="card">
        <h2 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          📁 1. Upload & Index PDF Document
        </h2>
        <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
          Upload a custom PDF or process the bundled <code>RAG.pdf</code> paper. The system extracts text page-by-page, chunks it into ~600 token blocks, and generates 768-dim embeddings.
        </p>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginTop: "1rem" }}>
          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />
          
          <button
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingPipeline}
          >
            {selectedFile ? `Selected: ${selectedFile.name}` : "Choose Custom PDF File..."}
          </button>

          <button
            className="btn-primary"
            onClick={() => handleProcessPdfPipeline(selectedFile)}
            disabled={isProcessingPipeline}
          >
            {isProcessingPipeline ? "Processing PDF..." : selectedFile ? "Upload & Process Custom PDF" : "Index RAG.pdf Document"}
          </button>
        </div>

        {/* PIPELINE PROGRESS BAR */}
        {pipelineStep && (
          <div style={{ marginTop: "1.25rem", padding: "0.8rem 1rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534", fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {isProcessingPipeline && (
              <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #166534", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
            )}
            {pipelineStep}
          </div>
        )}
      </section>

      {/* QUESTION INPUT & GROUNDED ANSWER CARD */}
      <section className="card" style={{ borderColor: "#c7d2fe" }}>
        <h2 style={{ fontSize: "1.25rem", color: "#4f46e5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          💬 2. Ask Questions (Grounded Q&A)
        </h2>
        <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
          Ask any question about the PDF. The system computes Cosine Similarity against all chunk vectors, retrieves the Top 3 context chunks, and prompts Gemma 3 4B to answer using strictly provided facts.
        </p>

        <form onSubmit={handleAskQuestion} style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the document..."
              disabled={isGeneratingAnswer}
              style={{ flex: 1, minWidth: "280px" }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isGeneratingAnswer || !question.trim()}
              style={{ padding: "0.75rem 1.75rem" }}
            >
              {isGeneratingAnswer ? "Thinking..." : "Ask Gemma 3 4B"}
            </button>
          </div>
        </form>

        {/* LOADING INDICATOR */}
        {isGeneratingAnswer && (
          <div style={{ marginTop: "1.5rem", padding: "1.25rem", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", textAlign: "center", color: "#64748b" }}>
            <div style={{ display: "inline-block", width: "24px", height: "24px", border: "3px solid #4f46e5", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "0.5rem" }}></div>
            <div>Embedding question $\rightarrow$ Searching 768-dim vectors $\rightarrow$ Generating answer with Gemma 3 4B...</div>
          </div>
        )}

        {/* GENERATED ANSWER & CITATIONS DISPLAY */}
        {answer && !isGeneratingAnswer && (
          <div style={{ marginTop: "1.5rem", padding: "1.5rem", backgroundColor: "#ffffff", border: "1px solid #a7f3d0", borderRadius: "10px", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", color: "#065f46", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                🤖 Gemma 3 4B Answer
              </h3>
              <span className="badge badge-success">Strictly Grounded in PDF</span>
            </div>

            {/* Answer Content */}
            <div style={{ fontSize: "1rem", lineHeight: "1.7", color: "#1e293b", backgroundColor: "#f8fafc", padding: "1.2rem", borderRadius: "8px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap" }}>
              {answer}
            </div>

            {/* SOURCE CITATIONS (Phase 7 Requirement) */}
            {sources && sources.length > 0 && (
              <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "0.9rem", color: "#334155" }}>📄 Source Citations:</strong>
                {sources.map((src, idx) => (
                  <span key={idx} className="badge" style={{ backgroundColor: "#e0e7ff", color: "#4338ca", border: "1px solid #c7d2fe", fontSize: "0.85rem" }}>
                    {src.file} — Page {src.page}
                  </span>
                ))}
              </div>
            )}

            {/* EXPANDABLE CONSTRUCTED PROMPT VIEWER */}
            {constructedPrompt && (
              <div style={{ marginTop: "1rem" }}>
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  style={{ background: "none", border: "none", color: "#4f46e5", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, padding: 0, textDecoration: "underline" }}
                >
                  {showPrompt ? "▲ Hide Constructed LLM Prompt" : "▼ Show Constructed LLM Prompt (Where Chunks Are Inserted)"}
                </button>

                {showPrompt && (
                  <pre style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#334155", backgroundColor: "#f1f5f9", borderColor: "#cbd5e1" }}>
                    {constructedPrompt}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* RETRIEVED CONTEXT CHUNKS DISPLAY */}
      {retrievedChunks && retrievedChunks.length > 0 && (
        <section className="card">
          <h2 style={{ fontSize: "1.1rem", color: "#334155" }}>
            🔍 Top 3 Retrieved Context Chunks (Cosine Similarity)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {retrievedChunks.map((chunk, idx) => (
              <div key={chunk.chunkId + idx} style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.85rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: "#4f46e5" }}>Rank #{idx + 1} — ID: {chunk.chunkId}</span>
                  <span style={{ color: "#059669", fontWeight: 600 }}>Similarity: {chunk.score}</span>
                  <span style={{ color: "#64748b" }}>Page {chunk.pageNumber}</span>
                </div>
                <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: "1.5" }}>
                  {chunk.content}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DEBUG & DATA INSPECTOR TOGGLE */}
      <section style={{ marginTop: "2rem", textAlign: "center" }}>
        <button
          className="btn-secondary"
          onClick={() => setShowDebugInspector(!showDebugInspector)}
          style={{ fontSize: "0.85rem" }}
        >
          {showDebugInspector ? "▲ Hide Raw Data Inspector" : "▼ Inspect Raw Data (Extracted Pages, Chunks & Vectors)"}
        </button>

        {showDebugInspector && (
          <div style={{ marginTop: "1.5rem", textAlign: "left" }} className="card">
            <h3>Raw Data Inspection</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", fontSize: "0.9rem" }}>
              <div>
                <strong>Extracted Pages JSON:</strong>
                <pre style={{ maxHeight: "200px" }}>
                  {JSON.stringify(extractedData?.pages.slice(0, 2), null, 2)}
                </pre>
              </div>
              <div>
                <strong>Text Chunks JSON:</strong>
                <pre style={{ maxHeight: "200px" }}>
                  {JSON.stringify(chunkData?.chunks.slice(0, 2), null, 2)}
                </pre>
              </div>
              <div>
                <strong>Vectors JSON Sample:</strong>
                <pre style={{ maxHeight: "200px" }}>
                  {JSON.stringify(
                    embedData?.vectors[0]
                      ? {
                          id: embedData.vectors[0].id,
                          page: embedData.vectors[0].pageNumber,
                          dimensions: embedData.vectors[0].embedding.length,
                          sampleVector: embedData.vectors[0].embedding.slice(0, 5),
                        }
                      : null,
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CSS ANIMATION FOR SPINNER */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
