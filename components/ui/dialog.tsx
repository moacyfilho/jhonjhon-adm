"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-[101] max-w-lg w-full animate-in zoom-in-95 fade-in duration-300 ease-out">
        {children}
      </div>
    </div>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function DialogContent({ children, onClose, className }: DialogContentProps) {
  return (
    <div className={`glass-panel border-white/10 rounded-[2rem] shadow-2xl overflow-hidden relative ${className || ''}`}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 lg:p-3 hover:bg-white/10 rounded-2xl transition-all text-gray-500 hover:text-white z-10"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-8 pb-4 ${className || ""}`}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-3xl font-serif font-bold text-white tracking-tight ${className || ""}`}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-gray-500 mt-2 font-medium ${className || ""}`}>{children}</p>;
}

export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-8 pt-2 ${className || ""}`}>{children}</div>;
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-8 pt-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-end gap-4 ${className || ""}`}>
      {children}
    </div>
  );
}
