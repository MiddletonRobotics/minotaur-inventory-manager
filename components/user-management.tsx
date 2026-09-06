"use client";

import { useActionState, useTransition, useState } from "react";
import { createUser, deactivateUser, reactivateUser, promoteUser, demoteUser, type CreateUserState, type ReactivateUserState, type PromoteUserState } from "@/server/users";

import ActionMenu, { actionMenuItemCSS, dangerousActionMenuItemCSS } from "@/components/action-menu";
import Window from "@/components/window";

type DeleteUserButtonProps = { userId: number; userName: string };
type ReactivateUserControlProps = { userId: number; userName: string; userRole: "STANDARD" | "MANAGER" | "ADMINISTRATOR" };
type PromoteUserControlProps = { userId: number };
type DemoteUserButtonProps = { userId: number; userName: string };
type UserActionsMenuProps = { userId: number; userName: string; userRole: "STANDARD" | "MANAGER" | "ADMINISTRATOR" };

export function CreateUserForm() {
    const [role, setRole] = useState<"STANDARD" | "MANAGER">("STANDARD");
    const [state, formAction, pending] = useActionState<CreateUserState, FormData>(createUser, undefined);

    return (
        <form action={formAction} className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label htmlFor="firstName" className="block text-sm font-medium text-fg">
                        First Name
                    </label>
                    <input
                        id="firstName"
                        name="firstName"
                        required
                        className="w-full rounded-md border bg-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
                        placeholder="First Name"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="lastName" className="block text-sm font-medium text-fg">
                        Last Name
                    </label>
                    <input
                        id="lastName"
                        name="lastName"
                        required
                        className="w-full rounded-md border bg-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
                        placeholder="Last Name"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="role" className="block text-sm font-medium text-fg">
                    Account Level
                </label>
                <select
                    id="role"
                    name="role"
                    value={role}
                    onChange={(event) => setRole(event.currentTarget.value === "MANAGER" ? "MANAGER" : "STANDARD")}
                    className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg outline-none focus:border-border-focus"
                >
                    <option value="STANDARD">Standard</option>
                    <option value="MANAGER">Manager</option>
                </select>
            </div>

            {role === "MANAGER" ? (
                <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium text-fg">
                        Custom Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        className="w-full rounded-md border bg-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
                        placeholder="Enter a unique password"
                    />

                    <p className="text-xs text-fg-muted">Manager accounts must have their own password.</p>
                </div>
            ) : (
                <p className="text-xs text-fg-muted">Standard accounts automatically use the shared team password.</p>
            )}

            {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
            {state?.success ? <p className="text-sm text-fg-muted">{state.success}</p> : null}

            <button type="submit" disabled={pending} className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">
                {pending ? "Creating..." : "Create User"}
            </button>
        </form>
    );
}

export function DeactivateUserButton({ userId, userName }: DeleteUserButtonProps) {
    const deleteAction = deactivateUser.bind(null, userId);

    return (
        <form
            action={deleteAction}
            onSubmit={(event) => {
                if (!window.confirm(`Delete the account for ${userName}?`)) {
                    event.preventDefault();
                }
            }}
        >
            <button type="submit" className="rounded-md border border-accent/50 px-3 py-1.5 text-sm text-accent transition-colors hover:border-accent hover:bg-accent/10">
                Deactivate
            </button>
        </form>
    );
}

export function ReactivateUserControl({ userId, userRole }: ReactivateUserControlProps) {
    const reactivateAction = reactivateUser.bind(null, userId);
    const [state, formAction, pending] = useActionState<ReactivateUserState, FormData>(reactivateAction, undefined);

    if (userRole === "ADMINISTRATOR") {
        return null;
    }

    return (
        <form action={formAction} className="flex flex-col items-end gap-2">
            {userRole === "MANAGER" && (
                <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="New manager password"
                    className="w-56 rounded-md border bg-input px-3 py-2 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
                />
            )}

            <button
                type="submit"
                disabled={pending}
                className="rounded-md border border-green-600/50 px-3 py-1.5 text-sm text-green-600 transition-colors hover:border-green-500 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {pending ? "Reactivating..." : "Reactivate"}
            </button>

            {state?.error && <p className="max-w-64 text-right text-xs text-accent">{state.error}</p>}

            {state?.success && <p className="max-w-64 text-right text-xs text-fg-muted">{state.success}</p>}
        </form>
    );
}

export function PromoteUserControl({ userId }: PromoteUserControlProps) {
    const promoteAction = promoteUser.bind(null, userId);
    const [state, formAction, pending] = useActionState<PromoteUserState, FormData>(promoteAction, undefined);

    return (
        <form action={formAction} className="flex flex-col items-end gap-2">
            <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
                placeholder="New manager password"
                className="w-56 rounded-md border bg-input px-3 py-2 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
            />

            <button
                type="submit"
                disabled={pending}
                className="rounded-md border border-green-600/50 px-3 py-1.5 text-sm text-green-600 transition-colors hover:border-green-500 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {pending ? "Promoting..." : "Promote"}
            </button>

            {state?.error && <p className="max-w-64 text-right text-xs text-accent">{state.error}</p>}

            {state?.success && <p className="max-w-64 text-right text-xs text-fg-muted">{state.success}</p>}
        </form>
    );
}

export function DemoteUserButton({ userId, userName }: DemoteUserButtonProps) {
    const demoteAction = demoteUser.bind(null, userId);

    return (
        <form
            action={demoteAction}
            onSubmit={(event) => {
                if (!window.confirm(`Demote ${userName} to Standard? Their password will be reset to the current team password.`)) {
                    event.preventDefault();
                }
            }}
        >
            <button type="submit" className="rounded-md border border-accent/50 px-3 py-1.5 text-sm text-accent transition-colors hover:border-accent hover:bg-accent/10">
                Demote
            </button>
        </form>
    );
}

export function UserActionsMenu({ userId, userName, userRole }: UserActionsMenuProps) {
    const [promoteOpen, setPromoteOpen] = useState(false);
    const demoteAction = demoteUser.bind(null, userId);
    const deactivateAction = deactivateUser.bind(null, userId);
    const [promoteError, setPromoteError] = useState<string | null>(null);
    const [promoting, startPromoting] = useTransition();

    if (userRole === "ADMINISTRATOR") return null;

    return (
        <>
            <ActionMenu>
                {userRole === "STANDARD" && (
                    <button type="button" onClick={() => setPromoteOpen(true)} className={actionMenuItemCSS}>
                        Promote to Manager
                    </button>
                )}

                {userRole === "MANAGER" && (
                    <form
                        action={demoteAction}
                        onSubmit={(event) => {
                            if (!window.confirm(`Demote ${userName} to Standard? Their password will be reset to the team password.`)) {
                                event.preventDefault();
                            }
                        }}
                    >
                        <button type="submit" className={actionMenuItemCSS}>
                            Demote to Standard
                        </button>
                    </form>
                )}

                <form
                    action={deactivateAction}
                    onSubmit={(event) => {
                        if (!window.confirm(`Deactivate ${userName}?`)) {
                            event.preventDefault();
                        }
                    }}
                >
                    <button type="submit" className={dangerousActionMenuItemCSS}>
                        Deactivate
                    </button>
                </form>
            </ActionMenu>

            <Window open={promoteOpen} onClose={() => setPromoteOpen(false)} title="Promote to Manager" description={`Set a unique password for ${userName}.`}>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);

                        startPromoting(async () => {
                            const result = await promoteUser(userId, undefined, formData);

                            if (result?.error) {
                                setPromoteError(result.error);

                                return;
                            }

                            setPromoteError(null);
                            setPromoteOpen(false);
                        });
                    }}

                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <label htmlFor={`promote-password-${userId}`} className="block text-sm font-medium text-fg">
                            Manager Password
                        </label>
                        <input
                            id={`promote-password-${userId}`}
                            name="password"
                            type="password"
                            required
                            minLength={8}
                            maxLength={100}
                            autoComplete="new-password"
                            placeholder="Enter a unique password"
                            className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg outline-non focus:border-border-focus"
                        />
                    </div>

                    {promoteError && <p className="text-sm text-accent">{promoteError}</p>}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setPromoteOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted hover:text-fg">
                            Cancel
                        </button>
                        <button type="submit" disabled={promoting} className="rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover disabled:opacity-60">
                            {promoting ? "Promoting..." : "Promote"}
                        </button>
                    </div>
                </form>
            </Window>
        </>
    );
}
