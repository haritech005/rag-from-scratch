"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";
import { DocumentMeta } from "@/lib/storage";
import { ChatMessage } from "@/types";

export default function Home() {
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);

  // Fetch active document status on mount
  useEffect(() => {
    fetchDocumentStatus();
  }, []);

  const fetchDocumentStatus = async () => {
    try {
      const res = await fetch("/api/document/status");
      const data = await res.json();
      if (data.success && data.hasDocument) {
        setDocumentMeta(data.document);
      } else {
        setDocumentMeta(null);
      }
    } catch (error) {
      console.error("Error fetching document status:", error);
    }
  };

  // Automated PDF Upload & RAG Indexing Handler
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStep("1. Parsing text pages...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setUploadStep("2. Chunking & Generating 768-dim embeddings...");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(`Upload Failed: ${data.error || "Failed to process PDF file."}`);
        setIsUploading(false);
        return;
      }

      setDocumentMeta(data.document);
      setChatHistory([]); // Reset chat history for new document
      alert(`Success! "${file.name}" has been indexed and is ready for chat.`);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(`Upload Error: ${error.message || "Failed to upload file"}`);
    } finally {
      setIsUploading(false);
      setUploadStep("");
    }
  };

  // Clear / Reset Document Handler
  const handleClearDocument = async () => {
    if (!confirm("Are you sure you want to remove the current document?")) return;
    try {
      await fetch("/api/document", { method: "DELETE" });
      setDocumentMeta(null);
      setChatHistory([]);
    } catch (error) {
      console.error("Error clearing document:", error);
    }
  };

  // Conversational Query Handler
  const handleSendMessage = async (question: string) => {
    if (!question.trim() || isQuerying || !documentMeta) return;

    const userMessage: ChatMessage = { role: "user", content: question };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setIsQuerying(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          chatHistory: updatedHistory,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Error: ${data.error || "Failed to get an answer from Ollama."}`,
          },
        ]);
        return;
      }

      const botMessage: ChatMessage = {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
      };

      setChatHistory((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Network Error: ${error.message || "Could not reach server."}`,
        },
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0f1015] font-sans overflow-hidden antialiased">
      {/* Left Sidebar Panel */}
      <Sidebar
        documentMeta={documentMeta}
        isUploading={isUploading}
        uploadStep={uploadStep}
        onFileUpload={handleFileUpload}
        onClearDocument={handleClearDocument}
      />

      {/* Right Chat Area Panel */}
      <ChatArea
        documentMeta={documentMeta}
        chatHistory={chatHistory}
        isQuerying={isQuerying}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
