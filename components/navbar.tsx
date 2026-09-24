import Link from "next/link";
import Image from "next/image";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { authenticate } from "@/server/session";
import { logout } from "@/server/auth";
import logo from "../public/logo.png";

const navigationElements = [
    { href: "/inventory", label: "Inventory" },
    { href: "/checkout", label: "Checkout" },
    { href: "/projects", label: "Projects" },
    { href: "/audit", label: "Audit" },
];

function displayName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

export default async function Navbar() {
    const session = await authenticate();
    const userName = session === null ? "Unknown" : displayName(session.user.firstName, session.user.lastName);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-bg">
            <div className="flex h-20 items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-6">
                    <Link href="/" className="group flex items-center gap-2.5">
                        <Image src={logo} alt="Minotaur Logo" width={38} height={38} className="rounded-md transition-transform group-hover:scale-105" />
                        <span className="font-dmsans text-2xl font-semibold tracking-tight text-fg">MinoManager</span>
                    </Link>

                    <nav className="hidden items-center gap-10 pl-3 lg:flex">
                        {navigationElements.map((link) => (
                            <Link key={link.href} href={link.href} className="group relative py-2 font-dmsans text-xl font-medium text-fg-muted transition-colors hover:text-fg">
                                {link.label}
                                <span className="absolute bottom-0 left-0 h-0.5 w-full scale-x-0 bg-fg transition-transform duration-250 ease-out group-hover:scale-x-100" />
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="hidden items-center gap-3 lg:flex">
                    <Link href="/settings" aria-label="Settings" className="group relative p-2 text-fg-muted transition-colors hover:text-fg">
                        <Settings size={26} />
                        <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 scale-x-0 bg-fg transition-transform duration-250 ease-out group-hover:scale-x-100" />
                    </Link>

                    <div className="flex h-8 items-center gap-2 rounded-full border border-border px-3 py-1 font-medium text-fg">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <span className="max-w-37.5 truncate text-lg">{userName}</span>
                    </div>

                    <form action={logout}>
                        <button type="submit" aria-label="Logout" className="group relative p-2 text-fg-muted transition-colors hover:text-fg">
                            <LogOut size={26} />
                            <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 scale-x-0 bg-fg transition-transform duration-250 ease-out group-hover:scale-x-100" />
                        </button>
                    </form>
                </div>

                <div className="lg:hidden">
                    <input id="mobile-navigation-toggle" type="checkbox" className="peer sr-only" />
                    <label 
                        htmlFor="mobile-navigation-toggle" 
                        aria-label="Open navigation menu" 
                        className="relative z-[70] flex cursor-pointer items-center justify-center rounded-md p-2 text-fg-muted transition-colors hover:bg-input hover:text-fg peer-checked:hidden"
                    >
                        <Menu size={28} />
                    </label>

                    <label
                        htmlFor="mobile-navigation-toggle"
                        aria-label="Close navigation menu"
                        className="relative z-[70] hidden cursor-pointer items-center justify-center rounded-md p-2 text-fg-muted transition-colors hover:bg-input hover:text-fg peer-checked:flex"
                    >
                        <X size={28} />
                    </label>

                    <label
                        htmlFor="mobile-navigation-toggle"
                        aria-label="Close navigation menu"
                        className="pointer-events-none fixed inset-x-0 bottom-0 top-20 z-40 bg-black/50 opacity-0 transition-opacity duration-200 peer-checked:pointer-events-auto peer-checked:opacity-100"
                    />

                    <aside className="fixed right-0 top-20 z-50 w-[min(70vw,16rem)] max-h-[calc(100vh-5rem)] translate-x-full overflow-y-auto rounded-bl-lg border-b border-l border-border bg-bg shadow-2xl transition-transform duration-200 ease-out peer-checked:translate-x-0">
                        <nav className="flex flex-col px-4 py-3">
                            {navigationElements.map((link) => (
                                <Link key={link.href} href={link.href} className="border-b border-border px-2 py-3.5 text-center font-dmsans text-base font-medium text-fg-muted transition-colors last:border-b-0 hover:bg-input hover:text-fg">
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="border-t border-border px-4 py-3">
                            <Link href="/settings" className="flex items-center justify-center gap-3 rounded-md px-2 py-3 text-fg-muted transition-colors hover:bg-input hover:text-fg">
                                <Settings size={20} />
                                <span className="font-dmsans text-base font-medium">Settings</span>
                            </Link>

                            <div className="flex items-center justify-center gap-3 px-2 py-3 text-fg">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                <span className="min-w-0 truncate text-center font-dmsans text-base font-medium">{userName}</span>
                            </div>

                            <form action={logout}>
                                <button type="submit" className="flex w-full items-center justify-center gap-3 rounded-md px-2 py-3 text-fg-muted transition-colors hover:bg-input hover:text-fg">
                                    <LogOut size={20} />
                                    <span className="font-dmsans text-base font-medium">Logout</span>
                                </button>
                            </form>
                        </div>
                    </aside>
                </div>
            </div>
        </header>
    );
}