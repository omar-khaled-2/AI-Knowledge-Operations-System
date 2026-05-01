"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createSignedUrl } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface UploadButtonProps {
  projectId: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const ALLOWED_EXTENSIONS = ".pdf,.doc,.docx,.txt,.md";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function UploadButton({ projectId }: UploadButtonProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    []
  );

  const processFile = async (file: File) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(
        "Invalid file type. Please upload a PDF, DOC, DOCX, TXT, or MD file."
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 50MB.");
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Get presigned URL from server
      const result = await createSignedUrl({
        filename: file.name,
        mimeType: file.type,
        projectId,
        size: file.size,
      });

      const { uploadUrl } = result;

      // Step 2: Upload file directly to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.status}`);
      }

      toast.success(`"${file.name}" uploaded successfully`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus data-icon="inline-start" />
                Upload
              </>
            )}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Select a file to upload to this project
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS}
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload document"
          />
          <button
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            disabled={isUploading}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/50 p-8 transition-colors",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isDragOver && "border-primary bg-primary/5",
              isUploading && "pointer-events-none opacity-60"
            )}
          >
            {isUploading ? (
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="size-8 text-muted-foreground" />
            )}
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium">
                {isUploading ? "Uploading..." : "Click or drag and drop"}
              </span>
              <span className="text-xs text-muted-foreground">
                PDF, DOC, DOCX, TXT, MD — max 50MB
              </span>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
