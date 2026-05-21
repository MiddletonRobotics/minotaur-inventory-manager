import Link from 'next/link';
import { Settings } from 'lucide-react';

import { authenticate } from '@/lib/session';
import { logout } from '@/server/auth';

const navItems = [
    { href: '/inventory', label: 'Inventory' },
    { href: '/projects', label: 'Projects' },
]

export default async function Navbar() {
    const session = await authenticate();

    return (
        <header className="h-[60px] w-full border-b border-border bg-bg flex items-center justify-between px-6">
            <div className="flex tiems-cetner gap-2">
                <Link href="/" className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-accent" />
                    <span className="text-sm">MinoManager</span>
                </Link>

                <nav className="flex items-center gap-1">
                    {navItems.map((link) => (
                        <Link key={link.href} href={link.href} className="px-3 py-1.5 rounded-md text-sm text-fg-muted transition-colors hover:bg-accent/15 hover:text-fg">
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-1">
                <Link href="/settings" aria-label="Settings" className="p-2 rounded-md text-fg-muted transition-colors hover:bg-accent/15 hover:text-fg">
                    <Settings size={16} />
                </Link>
                <Link href="/login" aria-label="Login" className="p-2 rounded-md text-fg-muted transition-colors hover:bg-accent/15 hover:text-fg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                </Link>
            </div>
        </header>
    )
}