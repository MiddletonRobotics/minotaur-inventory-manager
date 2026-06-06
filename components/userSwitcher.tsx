'use client'

import { useLayoutEffect, useRef, useState, useTransition } from "react"
import type { CSSProperties } from "react"
import { useRouter } from "next/navigation"
import { LogIn } from "lucide-react"

import type { StoredSessionSummary } from "@/lib/session"
import { switchUser } from "@/server/auth"

interface Props {
    currentUserId: string,
    sessions: StoredSessionSummary[]
}

function displayName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

export default function UserSwitcher({ currentUserId, sessions }: Props) {
    const [open, setOpen] = useState(false);
    const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const ref = useRef<HTMLDivElement>(null);

    const current = sessions.find(s => s.userId === currentUserId);
    const others = sessions.filter(s => s.userId !== currentUserId);

    useLayoutEffect(() => {
        if (!open) return;

        function updatePanelPosition() {
            const trigger = ref.current;
            if (!trigger) return;

            const rect = trigger.getBoundingClientRect();
            const viewportPadding = 8;
            const minPanelWidth = 220;
            const left = Math.min(
                Math.max(viewportPadding, rect.left),
                Math.max(viewportPadding, window.innerWidth - minPanelWidth - viewportPadding)
            );

            setPanelStyle({
                position: "fixed",
                top: rect.bottom + 6,
                left,
                right: viewportPadding,
            });
        }

        updatePanelPosition();

        function handlePointerDown(event: PointerEvent) {
            if (!ref.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("resize", updatePanelPosition);
        window.addEventListener("scroll", updatePanelPosition, true);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("resize", updatePanelPosition);
            window.removeEventListener("scroll", updatePanelPosition, true);
        };
    }, [open]);

    function handleSwitch(token: string, isValid: boolean) {
        if (!isValid) {
            router.push('/login?addSession=1');
            return;
        }

        startTransition(async () => {
            await switchUser(token);
        });
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                disabled={isPending}
                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium leading-none transition-colors hover:bg-accent/15 hover:text-fg disabled:opacity-50"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${current?.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="max-w-[150px] truncate text-xs">{current ? displayName(current.firstName, current.lastName) : 'Unknown'}</span>
                <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
                {open && panelStyle && (
                <div role="listbox" style={panelStyle} className="z-50 overflow-hidden rounded-md border border-border bg-bg py-1 text-xs shadow-lg">
                    {others.length > 0 && (
                        <p className="px-3 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-fg-muted">Switch User</p>
                    )}

                    {others.length === 0 && (
                        <p className="px-3 py-2 text-xs leading-4 text-fg-muted">No other sessions found.</p>
                    )}

                    {others.map(s => (
                        <button key={s.userId} type="button" role="option" onClick={() => handleSwitch(s.userId, s.isValid)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent/15">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="flex-1 truncate">{displayName(s.firstName, s.lastName)}</span>

                            {!s.isValid && (
                                <span className="shrink-0 text-[10px] text-fg-muted">Expired</span>
                            )}
                        </button>
                    ))}

                    <div className="border-t border-border mt-1 pt-1">
                        <a href="/login?addSession=1" className="flex w-full items-center gap-2 px-3 py-2 text-xs text-fg-muted transition-colors hover:bg-accent/15">
                            <LogIn size={13} />
                            <span>Login as another user</span>
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}