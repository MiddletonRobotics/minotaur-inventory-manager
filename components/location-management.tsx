"use client";

import { useActionState } from "react";
import { createStorageLocation, deleteStorageLocation, type LocationActionState } from "@/server/locations";

type StorageLocation = { id: number; name: string };
type Props = { locations: StorageLocation[] };

function DeleteLocationButton({ location }: { location: StorageLocation }) {
    const deleteAction = deleteStorageLocation.bind(null, location.id);
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

    return (
        <div className="mt-6 max-w-xl">
            <form action={formAction} className="flex gap-2">
                <input name="name" required placeholder="Electrical Shelf" className="min-w-0 flex-1 rounded-md border bg-input px-3 py-2.5 text-sm text-fg outline-none focus:border-border-focus" />
                <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2.5 text-sm text-white hover:bg-accent-hover disabled:opacity-60">
                    {pending ? "Adding..." : "Add Location"}
                </button>
            </form>

            {state?.error && <p className="mt-2 text-sm text-accent">{state.error}</p>}

            {state?.success && <p className="mt-2 text-sm text-fg-muted">{state.success}</p>}

            <div className="mt-5">
                {locations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between py-2">
                        <span className="text-sm text-fg">{location.name}</span>

                        <DeleteLocationButton location={location} />
                    </div>
                ))}
            </div>
        </div>
    );
}
