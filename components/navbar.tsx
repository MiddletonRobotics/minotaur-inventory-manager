import Link from 'next/link';
import { LogOut, Settings } from 'lucide-react';
import { authenticate } from '@/lib/session';
import { logout } from '@/server/auth';
import Image from 'next/image';
import logo from '../public/logo.png'

const navItems = [
    { href: '/inventory', label: 'Inventory' },
    { href: '/projects', label: 'Projects' },
]

function displayName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

export default async function Navbar() {
    const session = await authenticate();

    return (
        <header className="h-[60px] w-full border-b border-border bg-bg flex items-center justify-between px-6">
            <div className="flex tiems-center gap-2">
                <Link href="/" className="flex items-center gap-2">
                    <Image src={logo} alt="Minotaur Logo" width={28} height={28} className="rounded-md" />
                    <span className="text-sm">MinoManager</span>
                </Link>

                <nav className="flex items-center gap-1">
                    {navItems.map((link) => (
                        <Link key={link.href} href={link.href} className="px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-accent/15 hover:text-fg">
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-1">
                <Link href="/settings" aria-label="Settings" className="p-2 rounded-md transition-colors hover:bg-accent/15 hover:text-fg">
                    <Settings size={16} />
                </Link>

                <div className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium leading-none transition-colors hover:bg-accent/15 hover:text-fg disabled:opacity-50">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-green-500" />
                    <span className="max-w-[150px] truncate text-xs">{session == null ? 'Unknown' : displayName(session.user.firstName, session.user.lastName)}</span>
                </div>

                <form action={logout}>
                    <button type="submit" aria-label="Logout" className="p-2 rounded-md transition-colors hover:bg-accent/15 hover:text-fg">
                        <LogOut size={16} />
                    </button>
                </form>
            </div>
        </header>
    )
}