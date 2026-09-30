"use client";

/**
 * ImageUploader
 *
 * Reusable dashboard image upload component.
 * - Shows a thumbnail preview of the current URL
 * - Drag-and-drop or click to select a file
 * - Uploads to Cloudinary via unsigned preset (no server needed)
 * - Falls back gracefully: shows a plain URL text input below
 * - Calls onUpload(url) with the Cloudinary secure URL on success
 *
 * Required env vars (in .env.local):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
 */

import { useRef, useState, useCallback } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  /** Current image URL (shown as preview) */
  value: string;
  /** Called with the new Cloudinary URL after a successful upload, or when URL is manually typed */
  onUpload: (url: string) => void;
  /** Label shown above the uploader */
  label?: string;
  /** Small helper text shown beneath */
  hint?: string;
  /** Accept string for the file input, default "image/*" */
  accept?: string;
  /** Height of the preview area, default 140px */
  previewHeight?: number;
}

type UploadState = "idle" | "uploading" | "success" | "error";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";
// Cloudinary's free-tier unsigned uploads and our bandwidth budget don't need
// anything larger than this for invitation imagery.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const UPLOAD_TIMEOUT_MS = 30_000;

export default function ImageUploader({
  value,
  onUpload,
  label,
  hint,
  accept = "image/*",
  previewHeight = 140,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      // No Cloudinary configured — let user paste URL manually
      setErrorMsg("Cloudinary not configured. Please paste a URL below.");
      setUploadState("error");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(`File is too large (max ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB).`);
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setProgress(0);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "yourstruly");

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
      xhr.timeout = UPLOAD_TIMEOUT_MS;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          onUpload(result.secure_url);
          setUploadState("success");
          setTimeout(() => setUploadState("idle"), 2000);
        } else {
          setErrorMsg("Upload failed. Check your Cloudinary preset.");
          setUploadState("error");
        }
      };

      xhr.onerror = () => {
        setErrorMsg("Network error during upload.");
        setUploadState("error");
      };

      xhr.ontimeout = () => {
        setErrorMsg("Upload timed out. Please try again.");
        setUploadState("error");
      };

      xhr.send(formData);
    } catch {
      setErrorMsg("Unexpected error during upload.");
      setUploadState("error");
    }
  }, [onUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) uploadFile(file);
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpload("");
    setUploadState("idle");
  };

  const isUploading = uploadState === "uploading";

  return (
    <div className="space-y-2">
      {label && (
        <label className="block font-sans text-xs font-semibold" style={{ color: "hsl(43,75%,40%)" }}>
          {label}
        </label>
      )}

      {/* Drop zone / preview */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 transition-all duration-200 overflow-hidden cursor-pointer ${
          isDragging
            ? "border-[hsl(43,75%,50%)] bg-[hsl(43,75%,50%)]/5 scale-[1.01]"
            : isUploading
            ? "border-[hsl(43,75%,50%)]/60 bg-[#FDFBF7] cursor-not-allowed"
            : value
            ? "border-[#E8E0D8] hover:border-[hsl(43,75%,50%)]/40"
            : "border-dashed border-[#E8E0D8] hover:border-[hsl(43,75%,50%)]/60 bg-[#FDFBF7]"
        }`}
        style={{ height: previewHeight }}
      >
        {/* Preview image */}
        {value && !isUploading && (
          <>
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {/* Clear button */}
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center transition-colors z-10"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            {/* Change overlay */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center group">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-sans font-semibold flex items-center gap-1 bg-black/60 px-3 py-1.5 rounded-full">
                <Upload className="w-3 h-3" /> Change
              </span>
            </div>
          </>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#FDFBF7]">
            <div className="w-8 h-8 rounded-full border-3 border-[#E8E0D8] border-t-[hsl(43,75%,50%)] animate-spin" style={{ borderWidth: 3 }} />
            <div className="w-3/4">
              <div className="h-1.5 bg-[#E8E0D8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[hsl(43,75%,50%)] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-1.5">{progress}% uploading…</p>
            </div>
          </div>
        )}

        {/* Success flash */}
        {uploadState === "success" && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-50/90 z-10">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
        )}

        {/* Empty state */}
        {!value && !isUploading && uploadState !== "success" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-[#E8E0D8] flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="text-center">
              <p className="font-sans text-xs font-medium">Drop image here or click to upload</p>
              <p className="font-sans text-[10px] mt-0.5 opacity-70">PNG, JPG, WebP · Max 10MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {uploadState === "error" && (
        <p className="flex items-center gap-1 font-sans text-[11px] text-red-600">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {errorMsg}
        </p>
      )}

      {/* Manual URL input fallback */}
      <div>
        <p className="font-sans text-[10px] text-muted-foreground mb-1">Or paste a URL directly:</p>
        <input
          type="url"
          value={value}
          onChange={(e) => onUpload(e.target.value)}
          placeholder="https://res.cloudinary.com/… or /local-image.jpg"
          className="w-full h-8 rounded-lg border border-[#E8E0D8] bg-[#FDFBF7] px-3 font-sans text-xs text-[hsl(25,30%,12%)] outline-none transition-all focus:border-[hsl(43,75%,50%)] focus:ring-2 focus:ring-[hsl(43,75%,50%)]/15 placeholder:text-[hsl(25,10%,65%)]"
        />
      </div>

      {hint && (
        <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">{hint}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
