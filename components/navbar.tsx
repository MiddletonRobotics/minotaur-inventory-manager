import Link from 'next/link';
import { LogOut, Settings } from 'lucide-react';
import { authenticate, getStoredSessions } from '@/lib/session';
import UserSwitcher from '@/components/userSwitcher';
import { logout } from '@/server/auth';
import Image from 'next/image';
import logo from '../public/logo.png'

const navItems = [
    { href: '/inventory', label: 'Inventory' },
    { href: '/projects', label: 'Projects' },
]

export default async function Navbar() {
    const session = await authenticate();
    const sessions = await getStoredSessions();

    return (
        <header className="h-[60px] w-full border-b border-border bg-bg flex items-center justify-between px-6">
            <div className="flex tiems-cetner gap-2">
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

                {session && (
                    <UserSwitcher currentUserId={session.user.id} sessions={sessions} />
                )}

                <form action={logout}>
                    <button type="submit" aria-label="Logout" className="p-2 rounded-md transition-colors hover:bg-accent/15 hover:text-fg">
                        <LogOut size={16} />
                    </button>
                </form>
            </div>
        </header>
    )
}