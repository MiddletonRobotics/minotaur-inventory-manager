"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

type WindowProps = { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode };

export default function Window({ open, title, description, onClose, children }: WindowProps) {
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-fg">{title}</h2>

                        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
                    </div>

                    <button type="button" onClick={onClose} className="rounded-md p-1 text-fg-muted transition-colors hover:bg-input hover:text-fg" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>
                <div className="mt-5">{children}</div>
            </div>
        </div>
    );
}
