"use client";

import { EllipsisVertical } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type ActionMenuProps = { children: ReactNode };

export default function ActionMenu({ children }: ActionMenuProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        function handleMouseDown(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
        }

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [open]);

    return (
        <div ref={containerRef} className="relative">
            <button type="button" onClick={() => setOpen((current) => !current)} className="rounded-md p-2 text-fg-muted transition-colors hover:bg-input hover:text-fg" aria-label="Actions">
                <EllipsisVertical size={18} />
            </button>

            {open && (
                <div
                    className="absolute right-0 top-full z-30 mt-1 min-w-44 rounded-md border border-border bg-card p-1 shadow-xl"
                    onClick={(event) => {
                        const target = event.target as Element;
                        if (target.closest("form")) {
                            window.setTimeout(() => {
                                setOpen(false);
                            }, 0);

                            return;
                        }

                        setOpen(false);
                    }}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

export const actionMenuItemCSS = "flex w-full items-center rounded px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-input hover:text-fg disabled:cursor-not-allowed disabled:opacity-40";
export const dangerousActionMenuItemCSS = "flex w-full items-center rounded px-3 py-2 text-left text-sm text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40";
