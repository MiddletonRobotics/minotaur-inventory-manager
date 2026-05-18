import { authenticate } from "@/lib/session";
import { logout } from "@/server/auth";

export default async function Home() {
    const session = await authenticate();

    return (
        <main className="flex flex-1 items-center justify-center px-4">
            <div className="text-center space-y-4">
                <h1 className="text-xl">Welcome, {session?.user.firstName} {session?.user.lastName}!</h1>
                <p className="text-sm text-fg-muted">{session?.user.isAdmin ? 'Administrator' : 'Standard'}</p>
                <form action={logout}>
                    <button type="submit" className="rounded-full bg-accent px-6 py-2 text-sm hover:bg-accent-hover transition-colors">
                        Logout
                    </button>
                </form>
            </div>                                                                                                                  
        </main>
    );
}