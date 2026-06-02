'use client';

import { use, useActionState } from "react";
import { login, type LoginState } from '@/server/auth';

export default function Login() {
    const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);

    return (
        <main className="flex flex-1 items-center justify-center px-4">
            <form action={formAction} className="w-full max-w-md rounded-xl bg-card p-6 space-y-5">
                <header className="space-y-1.5">
                    <h1 className="text-sm">Sign In</h1>
                    <p className="text-xs text-fg-muted">Enter your name and team password</p>
                </header>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                        <label htmlFor="firstName" className="block text-xs">First Name</label>
                        <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            required
                            placeholder="First Name"
                            autoComplete="given-name"
                            className="w-full rounded-md bg-input border border-border px-2.5 py-2 text-xs placeholder:text-fg-dim focus:outline-none focus:border-border-focus"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="lastName" className="block text-xs">Last Name</label>
                        <input 
                            id="lastName"
                            name="lastName"
                            type="text"
                            required
                            placeholder="Last Name"
                            autoComplete="family-name"
                            className="w-full rounded-md bg-input border border-border px-2.5 py-2 text-xs placeholder:text-fg-dim focus:outline-none focus:border-border-focus"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-xs">Password</label>
                    <input 
                        id="password"
                        name="password"
                        type="password"
                        required
                        placeholder="Enter Password"
                        autoComplete="current-password"
                        className="w-full rounded-md bg-input border border-border px-2.5 py-2 text-xs placeholder:text-fg-dim focus:outline-none focus:border-border-focus"
                    />
                </div>

                {state?.error && (
                    <p role="alert" className="text-xs text-accent">{state.error}</p>
                )}

                <button type="submit" disabled={pending} className="w-full rounded-full bg-accent py-2.5 text-sm text-fg hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                    {pending ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
        </main>
    );
}