"use client";

import React, { useState, useEffect } from "react";
import { ExtractedDocument, ChunkedDocument, TextChunk } from "@/types";

export default function Home() {
  const [extractedData, setExtractedData] = useState<ExtractedDocument | null>(null);
  const [chunkData, setChunkData] = useState<ChunkedDocument | null>(null);
  
  const [loadingExtract, setLoadingExtract] = useState<boolean>(false);
  const [loadingChunk, setLoadingChunk] = useState<boolean>(false);
  
  const [extractStatus, setExtractStatus] = useState<string>("");
  const [chunkStatus, setChunkStatus] = useState<string>("");

  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [selectedChunkId, setSelectedChunkId] = useState<string>("");

  // Load existing data on mount
  useEffect(() => {
    // Load Phase 1
    fetch("/api/ingest")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.document) {
          setExtractedData(data.document);
        }
      })
      .catch(() => {});

    // Load Phase 2
    fetch("/api/chunk")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setChunkData(resData.data);
          if (resData.data.chunks.length > 0) {
            setSelectedChunkId(resData.data.chunks[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleExtractPDF = async () => {
    setLoadingExtract(true);
    setExtractStatus("Extracting text page-by-page from RAG.pdf...");
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setExtractedData(data.document);
        setExtractStatus(`Successfully extracted ${data.document.totalPages} pages! Saved to data/extracted_pages.json`);
      } else {
        setExtractStatus(`Extraction Error: ${data.error}`);
      }
    } catch (err: any) {
      setExtractStatus(`Error: ${err.message}`);
    } finally {
      setLoadingExtract(false);
    }
  };

  const handleGenerateChunks = async () => {
    setLoadingChunk(true);
    setChunkStatus("Splitting extracted pages into overlapping chunks (500-800 tokens)...");
    try {
      const res = await fetch("/api/chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunkSize: 600, overlap: 100 }),
      });
      const resData = await res.json();
      if (resData.success) {
        setChunkData(resData.data);
        if (resData.data.chunks.length > 0) {
          setSelectedChunkId(resData.data.chunks[0].id);
        }
        setChunkStatus(`Successfully created ${resData.data.totalChunks} chunks! Saved to data/chunks.json`);
      } else {
        setChunkStatus(`Chunking Error: ${resData.error}`);
      }
    } catch (err: any) {
      setChunkStatus(`Error: ${err.message}`);
    } finally {
      setLoadingChunk(false);
    }
  };

  const currentSelectedChunk: TextChunk | undefined = chunkData?.chunks.find(
    (c) => c.id === selectedChunkId
  ) || chunkData?.chunks[0];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <span className="badge">Phase 1 & Phase 2: PDF Extraction & Text Chunking</span>
        <h1 style={{ fontSize: "2.2rem", marginTop: "0.5rem" }}>
          Local PDF RAG Application
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Extract PDF text page-by-page and split into ~600 token chunks with ~100 token overlap (No LangChain, No Vector DB yet).
        </p>
      </header>

      {/* PHASE 1 SECTION */}
      <section className="card">
        <h2>Phase 1: Extract PDF Text</h2>
        <p>
          Process <code>RAG.pdf</code> on the backend and save raw page text into <code>data/extracted_pages.json</code>.
        </p>
        <button
          onClick={handleExtractPDF}
          disabled={loadingExtract}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: loadingExtract ? "#30363d" : "var(--accent-color)",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loadingExtract ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
          }}
        >
          {loadingExtract ? "Extracting PDF Pages..." : "Extract PDF Text Page-by-Page"}
        </button>

        {extractStatus && (
          <p style={{ marginTop: "1rem", color: "var(--accent-color)", fontWeight: 500 }}>
            {extractStatus}
          </p>
        )}
      </section>

      {/* PHASE 2 SECTION */}
      <section className="card" style={{ marginTop: "1.5rem" }}>
        <h2>Phase 2: Generate Text Chunks</h2>
        <p>
          Split extracted text into overlapping chunks (~600 tokens target, ~100 tokens overlap) while keeping exact <code>pageNumber</code> citations.
        </p>
        <button
          onClick={handleGenerateChunks}
          disabled={loadingChunk}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: loadingChunk ? "#30363d" : "#238636",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loadingChunk ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
          }}
        >
          {loadingChunk ? "Generating Text Chunks..." : "Generate Text Chunks (Phase 2)"}
        </button>

        {chunkStatus && (
          <p style={{ marginTop: "1rem", color: "#2ea043", fontWeight: 500 }}>
            {chunkStatus}
          </p>
        )}
      </section>

      {/* PHASE 2 INSPECTOR & DISPLAY */}
      {chunkData && (
        <>
          <section className="card" style={{ marginTop: "1.5rem" }}>
            <h2>Phase 2 Overview: Chunks Dataset</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div>
                <strong>Total Chunks Produced:</strong> <br />
                <code>{chunkData.totalChunks} chunks</code>
              </div>
              <div>
                <strong>Target Chunk Size:</strong> <br />
                <code>~{chunkData.chunkSizeTokens} tokens (~2400 chars)</code>
              </div>
              <div>
                <strong>Chunk Overlap:</strong> <br />
                <code>~{chunkData.chunkOverlapTokens} tokens (~400 chars)</code>
              </div>
              <div>
                <strong>Saved File:</strong> <br />
                <code>data/chunks.json</code>
              </div>
            </div>
          </section>

          <section className="card" style={{ marginTop: "1.5rem" }}>
            <h2>Inspect Chunks Line-by-Line</h2>
            <div style={{ marginBottom: "1rem", display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
              <label htmlFor="chunk-select">Select Chunk ID to View:</label>
              <select
                id="chunk-select"
                value={selectedChunkId}
                onChange={(e) => setSelectedChunkId(e.target.value)}
                style={{
                  padding: "0.5rem 0.8rem",
                  borderRadius: "4px",
                  backgroundColor: "var(--code-bg)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-color)",
                }}
              >
                {chunkData.chunks.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} (Page {c.pageNumber} - {c.charCount} chars / ~{c.tokenCount} tokens)
                  </option>
                ))}
              </select>
            </div>

            {currentSelectedChunk && (
              <div style={{ backgroundColor: "var(--code-bg)", padding: "1rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                  <span><strong>Chunk ID:</strong> {currentSelectedChunk.id}</span>
                  <span><strong>Source Page:</strong> Page {currentSelectedChunk.pageNumber}</span>
                  <span><strong>Length:</strong> {currentSelectedChunk.charCount} characters (~{currentSelectedChunk.tokenCount} tokens)</span>
                </div>
                <div style={{ padding: "0.8rem", backgroundColor: "#0d1117", borderRadius: "4px", fontSize: "0.95rem", lineHeight: "1.5" }}>
                  {currentSelectedChunk.content}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* PHASE 1 EXTRACTED PAGE PREVIEW */}
      {extractedData && (
        <section className="card" style={{ marginTop: "1.5rem" }}>
          <h2>Phase 1 Source Page Preview</h2>
          <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label htmlFor="page-select">Select Source Page:</label>
            <select
              id="page-select"
              value={selectedPage}
              onChange={(e) => setSelectedPage(Number(e.target.value))}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                backgroundColor: "var(--code-bg)",
                color: "var(--text-main)",
                border: "1px solid var(--border-color)",
              }}
            >
              {extractedData.pages.map((p) => (
                <option key={p.page} value={p.page}>
                  Page {p.page}
                </option>
              ))}
            </select>
          </div>
          <pre
            style={{
              backgroundColor: "var(--code-bg)",
              padding: "1rem",
              borderRadius: "6px",
              overflowX: "auto",
              maxHeight: "250px",
              fontSize: "0.85rem",
              border: "1px solid var(--border-color)",
            }}
          >
            {JSON.stringify(
              extractedData.pages.find((p) => p.page === selectedPage) || extractedData.pages[0],
              null,
              2
            )}
          </pre>
        </section>
      )}
    </div>
  );
}
