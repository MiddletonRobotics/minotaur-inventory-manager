'use client'

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogIn } from "lucide-react"
import type { StoredSessionSummary } from "@/lib/session"
import { switchUser } from "@/server/auth"

interface Props {
    currentUserId: string,
    sessions: StoredSessionSummary[]
}

function initials(firstName: string, lastName: string) : string {
    return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

export default function UserSwitcher({ currentUserId, sessions }: Props) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const ref = useRef<HTMLDivElement>(null);

    const current = sessions.find(s => s.userId === currentUserId);
    const others = sessions.filter(s => s.userId !== currentUserId);

    function handleSwitch(token: string, isValid: boolean) {
        if (!isValid) {
            router.push('/login');
            return;
        }

        startTransition(async () => {
            await switchUser(token);
        });

        setOpen(false);
    }

    function handleBlur(e: React.FocusEvent) {
        if (!ref.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
        }
    }

    return (
        <div ref={ref} className="relative" onBlur={handleBlur}>
            <button onClick={() => setOpen(o => !o)} disabled={isPending} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-fg-muted transition-colors hover:bg-accent/15 hover:text-fg disabled:opacity-50" aria-haspopup="listbox" aria-expanded={open}>
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${current?.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="max-w-[150px] truncate text-xs">{current ? initials(current.firstName, current.lastName) : 'Unknown'}</span>
                <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {open && (
                <div role="listbox" className="absolute right-0 top-full mt-1 w-52 rounded-md border border-border bg-bg shadow-lg z-50 overflow-hidden py-1">
                    {others.length > 0 && (
                        <p className="px-3 pt-1 pb-1.5 text-xs text-fg-muted uppercase tracking-wider">Switch User</p>
                    )}

                    {others.length === 0 && (
                        <p className="px-3 py-2 text-xs text-fg-muted">No othger sessions found.</p>
                    )}

                    {others.map(s => (
                        <button key={s.userId} role="option" onClick={() => handleSwitch(s.token, s.isValid)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent/15 transition-colors">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="flex-1 truncate">{initials(s.firstName, s.lastName)}</span>

                            {!s.isValid && (
                                <span className="text-xs text-fg-muted shrink-0">Expired</span>
                            )}
                        </button>
                    ))}

                    <div className="border-t border-border mt-1 pt-1">
                        <a href="/login" className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/15 transition-colors text-fg-muted">
                            <LogIn size={13} />
                            <span>Login as another user</span>
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}