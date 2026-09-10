"use client";

import { Plus } from "lucide-react";
import ActionMenu, { actionMenuItemCSS, dangerousActionMenuItemCSS } from "@/components/action-menu";
import { useActionState, useTransition, useState } from "react";
import Window from "@/components/window";
import { createItem, deleteItem, editItem, adjustItemQuantity, type CreateItemState } from "@/server/items";

type VendorOption = { id: number; name: string; }
type LocationOption = { id: number, name: string; parentId: number | null; }
type ItemData = {
    id: number,
    name: string;
    partNumber: string;
    description: string;
    quantity: number;
    vendorId: number;
    locationId: number | null;
}

type AddItemButtonProps = {
    categoryId: number;
    categoryName: string;
    vendors: VendorOption[];
    locations: LocationOption[];
};

function locationLabel(location: LocationOption, locations: LocationOption[]) {
    const parent = locations.find((c) => c.id == location.parentId);

    if (!parent) return location.name;
    return `${parent.name} / ${location.name}`;
}

export function AddItemButton({ categoryId, categoryName, vendors, locations}: AddItemButtonProps) {
    const [open, setOpen] = useState(false);
    const createItemAction = createItem.bind(null, categoryId);
    const [state, formAction, pending] = useActionState<CreateItemState, FormData>(createItemAction, undefined);

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover">
                <Plus size={16} />
                Add Part
            </button>

            <Window open={open} onClose={() => setOpen(false)} title="Add Part" description={`Add a part to ${categoryName}.`}>
                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-fg">Part Name</label>
                        <input name="name" required className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-fg">Part Number</label>
                        <input name="partNumber" required className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-fg">Description</label>
                        <textarea name="description" rows={3} className="w-full resize-none rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-fg">Quantity</label>
                            <input name="quantity" type="number" required min={0} defaultValue={1} className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-fg">Vendor</label>
                            <select name="vendorId" required defaultValue="" className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg">
                                <option value="" disabled>Select</option>

                                {vendors.map((vendor) => (
                                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-fg">Location</label>
                        <select name="locationId" defaultValue="" className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg">
                            <option value="">Not Set</option>

                            {locations.map((location) => (
                                <option key={location.id} value={location.id}>{locationLabel(location, locations,)}</option>
                            ))}
                        </select>
                    </div>

                    {state?.error && (
                        <p className="text-sm text-accent">{state.error}</p>
                    )}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted">Cancel</button>
                        <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-60">{pending ? "Adding..." : "Add Part"}</button>
                    </div>
                </form>
            </Window>
        </>
    );
}

type ItemActionsMenuProps = { 
    item: ItemData; 
    categoryId: number;
    vendors: VendorOption[],
    locations: LocationOption[]; 
};

export function ItemActionsMenu({ item, categoryId, vendors, locations }: ItemActionsMenuProps) {
    const [window, setWindow] = useState< | "edit" | "adjust" | "delete" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function closeWindow() {
        setError(null);
        setWindow(null);
    }

    return (
        <>
            <ActionMenu>
                <button type="button" className={actionMenuItemCSS} onClick={() => setWindow("edit")}>Edit Part</button>
                <button type="button" className={actionMenuItemCSS} onClick={() => setWindow("adjust")}> Adjust Quantity</button>
                <button type="button" className={dangerousActionMenuItemCSS} onClick={() => setWindow("delete")}>Delete Part</button>
            </ActionMenu>

            <Window open={window === "edit"} onClose={closeWindow} title="Edit Part" description={item.name}>
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();

                        const formData = new FormData(event.currentTarget);

                        startTransition(async () => {
                                const result = await editItem(item.id, categoryId, undefined, formData);

                                if (result?.error) {
                                    setError(result.error,);
                                    return;
                                }

                                closeWindow();
                            },
                        );
                    }}
                >
                    <input name="name" required defaultValue={item.name} className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                    <input name="partNumber" required defaultValue={item.partNumber} className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                    <textarea name="description" rows={3}defaultValue={item.description} className="w-full resize-none rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                    <select name="vendorId" required defaultValue={item.vendorId} className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg">
                        {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                        ))}
                    </select>

                    <select name="locationId" defaultValue={item.locationId ?? ""} className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg">
                        <option value="">Not Set</option>

                        {locations.map((location) => (
                            <option key={location.id} value={location.id}>{locationLabel(location, locations)}</option>
                        ))}
                    </select>

                    {error && (
                        <p className="text-sm text-accent">{error}</p>
                    )}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={closeWindow} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted">Cancel</button>
                        <button disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-60">{pending ? "Saving..." : "Save"}</button>
                    </div>
                </form>
            </Window>

            <Window open={window === "adjust"} onClose={closeWindow} title="Adjust Quantity" description={`${item.name} currently has ${item.quantity} total.`}>
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();

                        const formData = new FormData(event.currentTarget,);

                        startTransition(async () => {
                                const result = await adjustItemQuantity(item.id, categoryId, undefined, formData);

                                if (result?.error) {
                                    setError(result.error);
                                    return;
                                }

                                closeWindow();
                            },
                        );
                    }}
                >
                    <div>
                        <label className="mb-2 block text-sm font-medium text-fg">Adjustment</label>
                        <input name="quantityDelta" type="number" required placeholder="+4 or -2" className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-fg">Reason</label>
                        <textarea name="reason" rows={3} placeholder="New shipment, damaged part, inventory correction..." className="w-full resize-none rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                    </div>

                    {error && (
                        <p className="text-sm text-accent">{error}</p>
                    )}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={closeWindow} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted">Cancel</button>
                        <button disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-60">
                            {pending ? "Adjusting..." : "Apply Adjustment"}
                        </button>
                    </div>
                </form>
            </Window>

            <Window open={window === "delete"} onClose={closeWindow} title="Delete Part" description={`Delete ${item.name}?`}>
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();

                        const formData = new FormData(event.currentTarget,);

                        startTransition(async () => {
                            const result = await deleteItem(item.id, categoryId, undefined, formData);

                            if (result?.error) {
                                setError(result.error);
                                return;
                            }

                            closeWindow();
                        });
                    }}
                >
                    <p className="text-sm text-fg-muted">This cannot be undone. Parts with inventory or project history cannot be deleted.</p>

                    {error && (
                        <p className="text-sm text-accent">{error}</p>
                    )}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={closeWindow} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted">Cancel</button>
                        <button disabled={pending} className="rounded-md border border-accent/50 px-4 py-2 text-sm text-accent hover:bg-accent/10 disabled:opacity-60">
                            {pending ? "Deleting..." : "Delete Part"}
                        </button>
                    </div>
                </form>
            </Window>
        </>
    );
}
