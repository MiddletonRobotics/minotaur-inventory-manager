"use client";

import { useActionState, useTransition, useState } from "react";
import { createUser, deactivateUser, reactivateUser, promoteUser, demoteUser, type CreateUserState, type PromoteUserState } from "@/server/users";

import ActionMenu, { actionMenuItemCSS, dangerousActionMenuItemCSS } from "@/components/ui/action-menu";
import Window from "@/components/ui/window";
import { changeTeamPassword, PasswordActionState } from "@/server/passwords";

type DeleteUserButtonProps = { userId: number; userName: string };
type DeactivatedUserActionsMenuProps = { userId: number; userName: string; userRole: "STANDARD" | "MANAGER" | "ADMINISTRATOR" };
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
                        className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
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
                        className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
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
                    className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none focus:border-border-focus"
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
                        className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
                        placeholder="Enter a unique password"
                    />

                    <p className="text-xs text-fg-muted">Manager accounts must have their own password.</p>
                </div>
            ) : (
                <p className="text-xs text-fg-muted">Standard accounts automatically use the shared team password.</p>
            )}

            {state?.error ? <p className="text-sm text-accent">{state.error}</p> : null}
            {state?.success ? <p className="text-sm text-fg-muted">{state.success}</p> : null}

            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={pending} className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">
                    {pending ? "Creating..." : "Create User"}
                </button>
                <TeamPasswordManagement />
            </div>
        </form>
    );
}

export function TeamPasswordManagement() {
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<PasswordActionState>(undefined);
    const [pending, startTransition] = useTransition();

    function openWindow() {
        setState(undefined);
        setOpen(true);
    }

    function closeWindow() {
        if (pending) return;

        setState(undefined);
        setOpen(false);
    }

    return (
        <>
            <button type="button" onClick={openWindow} className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:border-border-focus hover:text-fg">
                Change Team Password
            </button>

            <Window open={open} onClose={closeWindow} title="Change Team Password" description="This changes the shared password used by every Standard account.">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();

                        const form = event.currentTarget;
                        const formData = new FormData(form);

                        startTransition(async () => {
                            const result = await changeTeamPassword(undefined, formData);

                            if (result?.error) {
                                setState(result);
                                return;
                            }

                            form.reset();
                            setState(undefined);
                            setOpen(false);
                        });
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <label htmlFor="new-team-password" className="block text-sm font-medium text-fg">
                            New Team Password
                        </label>
                        <input
                            id="new-team-password"
                            name="newPassword"
                            type="password"
                            required
                            minLength={8}
                            maxLength={100}
                            autoComplete="new-password"
                            placeholder="Enter a new team password"
                            className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-border-focus"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="confirm-team-password" className="block text-sm font-medium text-fg">
                            Confirm Team Password
                        </label>
                        <input
                            id="confirm-team-password"
                            name="confirmPassword"
                            type="password"
                            required
                            minLength={8}
                            maxLength={100}
                            autoComplete="new-password"
                            placeholder="Re-enter the new password"
                            className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-border-focus"
                        />
                    </div>

                    {state?.error && (
                        <p role="alert" className="text-sm text-accent">
                            {state.error}
                        </p>
                    )}

                    <p className="text-xs text-fg-muted">The team password cannot match a Manager or Administrator password.</p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={closeWindow}
                            disabled={pending}
                            className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={pending}
                            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {pending ? "Changing..." : "Change Password"}
                        </button>
                    </div>
                </form>
            </Window>
        </>
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

export function DeactivatedUserActionsMenu({ userId, userName, userRole }: DeactivatedUserActionsMenuProps) {
    const [reactivateOpen, setReactivateOpen] = useState(false);
    const [reactivateError, setReactivateError] = useState<string | null>(null);
    const [reactivating, startReactivating] = useTransition();

    if (userRole === "ADMINISTRATOR") return null;

    function openReactivateWindow() {
        setReactivateError(null);
        setReactivateOpen(true);
    }

    return (
        <>
            <ActionMenu>
                <button type="button" onClick={openReactivateWindow} className={actionMenuItemCSS}>
                    Reactivate
                </button>
            </ActionMenu>

            <Window
                open={reactivateOpen}
                onClose={() => setReactivateOpen(false)}
                title="Reactivate User"
                description={userRole === "MANAGER" ? `Set a new unique Manager password for ${userName}.` : `Reactivate ${userName}. Their password will be reset to the shared team password.`}
            >
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);

                        startReactivating(async () => {
                            const result = await reactivateUser(userId, undefined, formData);

                            if (result?.error) {
                                setReactivateError(result.error);
                                return;
                            }

                            setReactivateError(null);
                            setReactivateOpen(false);
                        });
                    }}
                    className="space-y-4"
                >
                    {userRole === "MANAGER" && (
                        <div className="space-y-2">
                            <label htmlFor={`reactivate-password-${userId}`} className="block text-sm font-medium text-fg">
                                Manager Password
                            </label>
                            <input
                                id={`reactivate-password-${userId}`}
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                maxLength={100}
                                autoComplete="new-password"
                                placeholder="Enter a unique password"
                                className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-border-focus"
                            />

                            <p className="text-xs text-fg-muted">The password must be unique and cannot be the shared team password.</p>
                        </div>
                    )}

                    {reactivateError && <p className="text-sm text-accent">{reactivateError}</p>}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setReactivateOpen(false)}
                            disabled={reactivating}
                            className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={reactivating}
                            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {reactivating ? "Reactivating..." : "Reactivate"}
                        </button>
                    </div>
                </form>
            </Window>
        </>
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
