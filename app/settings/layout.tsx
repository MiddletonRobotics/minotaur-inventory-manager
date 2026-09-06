import Link from "next/link";
import { Boxes, FolderKanban, Users } from "lucide-react";
import { redirect } from "next/navigation";

import Navbar from "@/components/navbar";
import { authenticate } from "@/server/session";

export default async function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const session = await authenticate();

    if (!session) {
        redirect("/login");
    }

    if (session.user.role === "STANDARD") {
        redirect("/");
    }

    const isAdministrator = session.user.role === "ADMINISTRATOR";

    return (
        <>
            <Navbar />
            <main className="min-h-[calc(100vh-80px)]">
                <div className="mx-auto flex max-w-7xl gap-12 px-8 py-10">
                    <aside className="w-64 shrink-0">
                        <div className="sticky top-28">
                            <h1 className="mb-5 text-xl font-semibold text-fg">Settings</h1>

                            <nav className="space-y-1">
                                {isAdministrator && (
                                    <Link href="/settings/accounts" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-card hover:text-fg">
                                        <Users size={18} />
                                        User Accounts
                                    </Link>
                                )}

                                <Link href="/settings/inventory" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-card hover:text-fg">
                                    <Boxes size={18} />
                                    Inventory
                                </Link>

                                <Link href="/settings/projects" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-card hover:text-fg">
                                    <FolderKanban size={18} />
                                    Projects
                                </Link>
                            </nav>
                        </div>
                    </aside>
                    {children}
                </div>
            </main>
        </>
    );
}
