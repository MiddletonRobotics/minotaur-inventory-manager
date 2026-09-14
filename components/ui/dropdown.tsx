"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
    matchTriggerWidth?: boolean;
};

export const dropdownItemCSS = "flex w-full items-center rounded px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-input hover:text-fg disabled:cursor-not-allowed disabled:opacity-40";
export const dangerousDropdownItemCSS = "flex w-full items-center rounded px-3 py-2 text-left text-sm text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40";

export default function Dropdown({ trigger, children, align = "right", className = "", menuClassName = "", matchTriggerWidth = false }: DropdownProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const close = () => setOpen(false);
    const toggle = () => setOpen((current) => !current);
    const updatePosition = useCallback(() => {
        const triggerElement = containerRef.current;
        const menuElement = menuRef.current;

        if (!triggerElement || !menuElement) return;

        const triggerRect = triggerElement.getBoundingClientRect();
        const menuRect = menuElement.getBoundingClientRect();
        const gap = 4;
        const screenPadding = 8;
        const menuWidth = matchTriggerWidth ? triggerRect.width : menuRect.width;
        let top = triggerRect.bottom + gap;

        if (top + menuRect.height > window.innerHeight - screenPadding && triggerRect.top - gap - menuRect.height >= screenPadding) {
            top = triggerRect.top - gap - menuRect.height;
        }

        let left = align === "right" ? triggerRect.right - menuWidth : triggerRect.left;
        left = Math.max(screenPadding, Math.min(left, window.innerWidth - menuWidth - screenPadding));

        menuElement.style.top = `${top}px`;
        menuElement.style.left = `${left}px`;

        if (matchTriggerWidth) {
            menuElement.style.width = `${triggerRect.width}px`;
        } else {
            menuElement.style.removeProperty("width",);
        }

        menuElement.style.visibility = "visible";
    }, [align, matchTriggerWidth]);

    useLayoutEffect(() => {
        if (!open) return;
        updatePosition();

        const frame = requestAnimationFrame(updatePosition,);

        return () => cancelAnimationFrame(frame);
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;

        function handleMouseDown(event: MouseEvent) {
            const target = event.target as Node;
            const clickedTrigger = containerRef.current?.contains(target);
            const clickedMenu = menuRef.current?.contains(target);

            if (!clickedTrigger && !clickedMenu) setOpen(false);
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }

        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("scroll", updatePosition,true,);
            window.removeEventListener("resize", updatePosition);

            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, updatePosition]);

    const renderProps = { open, close, toggle, menuId };

    return (
        <>
            <div ref={containerRef} className={`relative ${className}`}>{trigger(renderProps)}</div>
            {open &&
                createPortal(
                    <div ref={menuRef} id={menuId} style={{position: "fixed", top: 0, left: 0, visibility: "hidden"}} className={`z-50 rounded-md border border-border bg-card p-1 shadow-xl ${menuClassName}`}>
                        {children(renderProps,)}
                    </div>,

                    document.body,
                )}
        </>
    );
}