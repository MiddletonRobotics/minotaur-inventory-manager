"use client";

import { useActionState } from "react";
import { createStorageLocation, deactivateStorageLocation, type LocationActionState } from "@/server/locations";

type StorageLocation = { id: number; name: string; active: boolean; parentId: number | null };
type Props = { locations: StorageLocation[] };

function RemoveLocationButton({ location }: { location: StorageLocation }) {
    const deleteAction = deactivateStorageLocation.bind(null, location.id);
    const [state, formAction, pending] = useActionState<LocationActionState, FormData>(deleteAction, undefined);

    return (
        <div>
            <form action={formAction}>
                <button type="submit" disabled={pending} className="rounded-md border border-accent/50 px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/10 disabled:opacity-60">
                    {pending ? "Removing..." : "Remove"}
                </button>
            </form>

            {state?.error && <p className="mt-1 text-xs text-accent">{state.error}</p>}
        </div>
    );
}

export function StorageLocationManagement({ locations }: Props) {
    const [state, formAction, pending] = useActionState<LocationActionState, FormData>(createStorageLocation, undefined);
    const rootLocations = locations.filter((location) => location.parentId === null);
    const parentLocations = locations.filter((location) => location.parentId === null);

    return (
        <div className="mt-6 max-w-xl">
            <form action={formAction} className="space-y-3">
                <input name="name" required placeholder="Shelf A" className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg outline-none focus:border-border-focus" />
                <div className="flex gap-2">
                    <select name="parentId" defaultValue="" className="min-w-0 flex-1 rounded-md border bg-input px-3 py-2.5 text-sm text-fg outline-none focus:border-border-focus">
                        <option value="">Top-level location</option>

                        {parentLocations.map((location) => (
                            <option key={location.id} value={location.id}>{location.name}</option>
                        ))}
                    </select>

                    <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2.5 text-sm text-white hover:bg-accent-hover disabled:opacity-60">
                        {pending ? "Adding..." : "Add Location"}
                    </button>
                </div>
            </form>

            {state?.error && (
                <p className="mt-2 text-sm text-accent">{state.error}</p>
            )}

            {state?.success && (
                <p className="mt-2 text-sm text-fg-muted">{state.success}</p>
            )}

            <div className="mt-5 space-y-3">
                {rootLocations.map((root) => {
                    const children = locations.filter((location) => location.parentId === root.id);

                    return (
                        <div key={root.id} className="pb-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-fg">{root.name}</span>
                                <RemoveLocationButton location={root} />
                            </div>

                            {children.length > 0 && (
                                <div className="ml-5 mt-2 pl-4">
                                    {children.map((child) => (
                                        <div key={child.id} className="flex items-center justify-between py-2">
                                            <span className="text-sm text-fg-muted">✱ {child.name}</span>
                                            <RemoveLocationButton location={child} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
