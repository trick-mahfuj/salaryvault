"use client";

import { Modal } from "./modal";
import { Button } from "./button";
import { Trash2, Download } from "lucide-react";

interface ImagePreviewProps {
  open: boolean;
  onClose: () => void;
  src: string;
  onDelete?: () => void;
}

export function ImagePreview({ open, onClose, src, onDelete }: ImagePreviewProps) {
  return (
    <Modal open={open} onClose={onClose} title="Screenshot Preview" size="lg">
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden bg-secondary/30 flex items-center justify-center max-h-[60vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Preview" className="max-w-full max-h-[60vh] object-contain rounded-xl" />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={() => { const a = document.createElement("a"); a.href = src; a.download = "screenshot"; a.click(); }}>
            <Download className="w-4 h-4 mr-1" /> Download
          </Button>
          {onDelete && (
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
