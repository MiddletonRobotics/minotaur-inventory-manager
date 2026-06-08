import Link from 'next/link';
import { LogOut, Settings } from 'lucide-react';
import { authenticate } from '@/lib/session';
import { logout } from '@/server/auth';
import Image from 'next/image';
import logo from '../public/logo.png'

const navItems = [
    { href: '/inventory', label: 'Inventory' },
    { href: '/checkout', label: 'Checkout' },
    { href: '/projects', label: 'Projects' },
]

function displayName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

export default async function Navbar() {
    const session = await authenticate();

    return (
        <header className="h-[60px] w-full border-b border-border bg-bg/95 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-50">
            <div className="flex items-center gap-6"> 
                <Link href="/" className="flex items-center gap-2.5 group">
                    <Image src={logo} alt="Minotaur Logo" width={30} height={30} className="rounded-md transition-transform group-hover:scale-105" />
                    <span className="text-sm tracking-tight text-fg">MinoManager</span>
                </Link>

                <nav className="flex items-center gap-1">
                    {navItems.map((link) => (
                        <Link key={link.href} href={link.href} className="px-3 py-1.5 rounded-md text-sm font-medium text-fg-muted transition-colors hover:text-fg group">{link.label}</Link>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-2">
                <Link href="/settings" aria-label="Settings" className="p-2 rounded-md text-fg-muted transition-colors hover:text-fg group">
                    <Settings size={18} />
                </Link>

                <div className="flex h-8 items-center gap-2 rounded-full border border-border bg-accent/5 px-3 py-1 text-xs font-medium text-fg">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    <span className="max-w-[150px] truncate">{session == null ? 'Unknown' : displayName(session.user.firstName, session.user.lastName)}</span>
                </div>

                <form action={logout}>
                    <button type="submit" aria-label="Logout" className="p-2 rounded-md text-fg-muted transition-colors hover:text-fg group">
                        <LogOut size={18} />
                    </button>
                </form>
            </div>
        </header>
    )
}