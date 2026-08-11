"use client";

import React, { useState, useEffect } from "react";
import { ExtractedDocument } from "@/types";

export default function Home() {
  const [extractedData, setExtractedData] = useState<ExtractedDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [selectedPage, setSelectedPage] = useState<number>(1);

  // Load existing extraction data on mount if available
  useEffect(() => {
    fetch("/api/ingest")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.document) {
          setExtractedData(data.document);
        }
      })
      .catch(() => {});
  }, []);

  const handleExtractPDF = async () => {
    setLoading(true);
    setStatusMessage("Extracting text page-by-page from RAG.pdf...");
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setExtractedData(data.document);
        setStatusMessage(`Successfully extracted ${data.document.totalPages} pages! Saved to data/extracted_pages.json`);
      } else {
        setStatusMessage(`Extraction Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header style={{ marginBottom: "2rem" }}>
        <span className="badge">Phase 1: PDF Text Extraction</span>
        <h1 style={{ fontSize: "2.2rem", marginTop: "0.5rem" }}>
          Local PDF RAG Application
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Extract text page-by-page from <code>RAG.pdf</code> without chunking, embedding, or LangChain.
        </p>
      </header>

      <section className="card">
        <h2>Phase 1 Action: Extract PDF Text</h2>
        <p>
          Click the button below to process <code>RAG.pdf</code> on the backend and extract text while preserving page numbers.
        </p>
        <button
          onClick={handleExtractPDF}
          disabled={loading}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: loading ? "#30363d" : "var(--accent-color)",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s ease",
          }}
        >
          {loading ? "Extracting PDF Pages..." : "Extract PDF Text Page-by-Page"}
        </button>

        {statusMessage && (
          <p style={{ marginTop: "1rem", color: "var(--accent-color)", fontWeight: 500 }}>
            {statusMessage}
          </p>
        )}
      </section>

      {extractedData && (
        <>
          <section className="card">
            <h2>Extracted Document Overview</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div>
                <strong>Filename:</strong> <br />
                <code>{extractedData.filename}</code>
              </div>
              <div>
                <strong>Total Pages Extracted:</strong> <br />
                <code>{extractedData.totalPages} pages</code>
              </div>
              <div>
                <strong>JSON File Saved At:</strong> <br />
                <code>data/extracted_pages.json</code>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Inspect Extracted Page JSON Structure</h2>
            <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <label htmlFor="page-select">Select Page to Preview:</label>
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
                maxHeight: "350px",
                fontSize: "0.9rem",
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

          <section className="card">
            <h2>Full JSON Structure Sample (First 2 Pages)</h2>
            <pre
              style={{
                backgroundColor: "var(--code-bg)",
                padding: "1rem",
                borderRadius: "6px",
                overflowX: "auto",
                maxHeight: "300px",
                fontSize: "0.85rem",
                border: "1px solid var(--border-color)",
              }}
            >
              {JSON.stringify(
                {
                  filename: extractedData.filename,
                  totalPages: extractedData.totalPages,
                  extractedAt: extractedData.extractedAt,
                  pages: extractedData.pages.slice(0, 2),
                },
                null,
                2
              )}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}
