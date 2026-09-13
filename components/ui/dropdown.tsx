"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type DropdownRenderProps = {
    open: boolean;
    close: () => void;
    toggle: () => void;
    menuId: string;
};

type DropdownProps = {
    trigger: (props: DropdownRenderProps) => ReactNode;
    children: (props: DropdownRenderProps) => ReactNode;
    align?: "left" | "right";
    className?: string;
    menuClassName?: string;
};

export const dropdownItemCSS = "flex w-full items-center rounded px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-input hover:text-fg disabled:cursor-not-allowed disabled:opacity-40";
export const dangerousDropdownItemCSS = "flex w-full items-center rounded px-3 py-2 text-left text-sm text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40";

export default function Dropdown({ trigger, children, align = "right", className = "", menuClassName = "" }: DropdownProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const close = () => setOpen(false);
    const toggle = () => setOpen((current) => !current);

    useEffect(() => {
        if (!open) return;

        function handleMouseDown(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const renderProps = { open, close, toggle, menuId };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {trigger(renderProps)}

            {open && (
                <div id={menuId} className={`absolute top-full z-30 mt-1 rounded-md border border-border bg-card p-1 shadow-xl ${align === "right" ? "right-0" : "left-0"} ${menuClassName}`}>
                    {children(renderProps)}
                </div>
            )}
        </div>
    );
}
