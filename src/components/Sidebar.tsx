"use client";

import React, { useState, useRef } from "react";
import { DocumentMeta } from "@/lib/storage";
import {
  FilePdfIcon,
  UploadCloudIcon,
  CheckIcon,
  ChevronDownIcon,
  TrashXIcon,
  SpinnerIcon,
} from "./Icons";

interface SidebarProps {
  documentMeta: DocumentMeta | null;
  isUploading: boolean;
  uploadStep: string;
  onFileUpload: (file: File) => void;
  onClearDocument: () => void;
}

export default function Sidebar({
  documentMeta,
  isUploading,
  uploadStep,
  onFileUpload,
  onClearDocument,
}: SidebarProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith(".pdf")) {
        onFileUpload(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <aside className="w-80 md:w-88 flex-shrink-0 bg-[#16171d] border-r border-[#262833] h-full flex flex-col p-5 text-slate-200 select-none overflow-y-auto">
      {/* 1. Header Title */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Choose your <span className="text-slate-300 font-bold">.pdf</span> file
      </h2>

      {/* 2. Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
          isDragOver
            ? "border-emerald-500 bg-emerald-950/20"
            : "border-[#2e3240] bg-[#1d1f27] hover:border-slate-500 hover:bg-[#222530]"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="w-12 h-12 rounded-full bg-[#282b37] flex items-center justify-center text-slate-400 mb-3 shadow-inner">
          <UploadCloudIcon className="w-6 h-6 text-slate-300" />
        </div>

        <p className="text-sm font-semibold text-slate-200 mb-1">
          Drag and drop file here
        </p>
        <p className="text-xs text-slate-400 mb-4">
          Limit 200MB per file • PDF
        </p>

        <button
          type="button"
          className="px-4 py-1.5 bg-[#2b2e3c] hover:bg-[#343849] text-xs font-medium text-slate-200 rounded-md border border-[#3c4154] shadow-sm transition-all"
        >
          Browse files
        </button>
      </div>

      {/* 3. Upload Spinner / Progress Notice */}
      {isUploading && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
          <SpinnerIcon className="text-amber-400 w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-300">Processing PDF...</p>
            <p className="text-[11px] text-amber-200/70 truncate">{uploadStep || "Extracting & Embedding"}</p>
          </div>
        </div>
      )}

      {/* 4. Active PDF Badge */}
      {documentMeta && (
        <div className="mt-4 p-3.5 bg-[#20222c] border border-[#2d303f] rounded-xl flex items-center justify-between shadow-md group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center flex-shrink-0">
              <FilePdfIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate max-w-[160px]" title={documentMeta.filename}>
                {documentMeta.filename}
              </p>
              <p className="text-[11px] text-slate-400">{documentMeta.fileSize}</p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearDocument();
            }}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
            title="Remove document"
          >
            <TrashXIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. Processing Document Accordion Status */}
      {documentMeta && (
        <div className="mt-3 bg-[#1d1f28] border border-[#2b2e3b] rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[#242733] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-200">
                Processing document
              </span>
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isStatusOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isStatusOpen && (
            <div className="px-3.5 pb-3 text-[11px] text-slate-400 space-y-1.5 border-t border-[#262936] pt-2.5">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-emerald-400 font-medium capitalize">
                  {documentMeta.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Pages:</span>
                <span className="text-slate-200 font-mono">{documentMeta.totalPages}</span>
              </div>
              <div className="flex justify-between">
                <span>Text Chunks:</span>
                <span className="text-slate-200 font-mono">{documentMeta.totalChunks}</span>
              </div>
              <div className="flex justify-between">
                <span>Vector Embeddings:</span>
                <span className="text-slate-200 font-mono">{documentMeta.totalVectors}</span>
              </div>
              <div className="flex justify-between">
                <span>Embedding Model:</span>
                <span className="text-slate-300 font-mono text-[10px]">nomic-embed-text</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. PDF Preview Section */}
      <div className="mt-6 flex-1 flex flex-col min-h-0">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          PDF Preview
        </h3>
        <div className="flex-1 bg-[#121319] border border-[#232631] rounded-xl flex flex-col items-center justify-center p-4 text-center overflow-hidden">
          {documentMeta ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shadow-inner">
                <FilePdfIcon className="w-7 h-7" />
              </div>
              <p className="text-xs font-medium text-slate-300 max-w-[200px] truncate">
                {documentMeta.filename}
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Indexed & Ready
              </span>
            </div>
          ) : (
            <div className="text-slate-500 space-y-1">
              <FilePdfIcon className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">No PDF Loaded</p>
              <p className="text-[10px] text-slate-600">Upload a PDF to view preview</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
