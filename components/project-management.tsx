"use client";

import { useActionState } from "react";
import { archiveProject, createProject, type ProjectActionState } from "@/server/projects";

export function CreateProjectForm() {
    const [state, formAction, pending] = useActionState<ProjectActionState, FormData>(createProject, undefined);

    return (
        <form action={formAction} className="mt-6 space-y-5">
            <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-fg">
                    Project Name
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="2027 Competition Robot"
                    className="w-full rounded-md border bg-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-fg">
                    Description
                </label>
                <textarea
                    id="description"
                    name="description"
                    rows={4}
                    placeholder="Optional project description"
                    className="w-full resize-none rounded-md border bg-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
                />
            </div>

            {state?.error && (
                <p role="alert" className="text-sm text-accent">
                    {" "}
                    {state.error}
                </p>
            )}

            {state?.success && <p className="text-sm text-fg-muted">{state.success}</p>}

            <button type="submit" disabled={pending} className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">
                {pending ? "Creating..." : "Create Project"}
            </button>
        </form>
    );
}

type ArchiveProjectButtonProps = { projectId: number; projectName: string; checkedOutQuantity: number };

export function ArchiveProjectButton({ projectId, projectName, checkedOutQuantity }: ArchiveProjectButtonProps) {
    const archiveAction = archiveProject.bind(null, projectId);

    return (
        <form
            action={archiveAction}
            onSubmit={(event) => {
                const message =
                    checkedOutQuantity > 0
                        ? `Archive ${projectName}? ${checkedOutQuantity} checked-out ${checkedOutQuantity === 1 ? "part" : "parts"} will become available in inventory again. The project's inventory history will be preserved.`
                        : `Archive ${projectName}?`;

                if (!window.confirm(message)) {
                    event.preventDefault();
                }
            }}
        >
            <button type="submit" className="rounded-md border border-accent/50 px-3 py-1.5 text-sm text-accent transition-colors hover:border-accent hover:bg-accent/10">
                Archive
            </button>
        </form>
    );
}
