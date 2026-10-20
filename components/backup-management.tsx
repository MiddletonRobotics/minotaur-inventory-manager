"use client";

import { useActionState } from "react";
import { createBackupAction, type CreateBackupState } from "@/app/settings/backups/actions";

const initialState: CreateBackupState = {
    status: "idle",
    message: "",
};

export default function CreateBackupButton() {
    const [state, formAction, pending] = useActionState(createBackupAction, initialState);

    return (
        <div className="flex shrink-0 flex-col items-end">
            <form action={formAction}>
                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-fg transition-colors hover:border-border-focus hover:bg-input disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {pending ? "Creating Backup..." : "Create Backup Now"}
                </button>
            </form>

            {state.message && <p className={`mt-2 max-w-xs text-right text-xs ${state.status === "error" ? "text-red-400" : "text-fg-muted"}`}>{state.message}</p>}
        </div>
    );
}
