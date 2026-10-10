"use client";

import { Plus, Trash2 } from "lucide-react";
import ActionMenu, { actionMenuItemCSS, dangerousActionMenuItemCSS } from "@/components/ui/action-menu";
import { useMemo, useRef, useActionState, useTransition, useState } from "react";
import Window from "@/components/ui/window";
import { createItem, deleteItem, editItem, adjustItemQuantity, type CreateItemState } from "@/server/items";
import { savePartFieldConfiguration } from "@/server/itemField";
import type { ItemFieldDefinitionData, ItemFieldType, ItemFieldValueData } from "@/lib/itemFields";
import { itemFieldInputName, buildItemNamePreview } from "@/lib/itemFields";

type VendorOption = { id: number; name: string };
type LocationOption = { id: number; name: string; parentId: number | null };
type ItemData = {
    id: number;
    name: string;
    partNumber: string;
    description: string;
    quantity: number;
    vendorId: number;
    locationId: number | null;
    itemFieldValues: ItemFieldValueData[];
};

type AddItemButtonProps = {
    categoryId: number;
    categoryName: string;
    vendors: VendorOption[];
    locations: LocationOption[];
    nameTemplate: string | null;
    itemFields: ItemFieldDefinitionData[];
};

function locationLabel(location: LocationOption, locations: LocationOption[]) {
    const parent = locations.find((c) => c.id == location.parentId);

    if (!parent) return location.name;
    return `${parent.name} / ${location.name}`;
}

export function AddItemButton({ categoryId, categoryName, vendors, locations, nameTemplate, itemFields }: AddItemButtonProps) {
    const [open, setOpen] = useState(false);
    const createItemAction = createItem.bind(null, categoryId);
    const [state, formAction, pending] = useActionState<CreateItemState, FormData>(createItemAction, undefined);

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover">
                <Plus size={16} />
                Add Part
            </button>

            <Window open={open} onClose={() => setOpen(false)} title="Add Part" description={itemFields.length > 0 ? undefined : `Add a part to ${categoryName}.`} size={itemFields.length > 0 ? "lg" : "md"}>
                <form action={formAction} className="space-y-4">
                    {itemFields.length > 0 ? (
                        <>
                            <ItemFieldInputs fields={itemFields} nameTemplate={nameTemplate} />
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-fg-muted">Part Number</label>
                                <input name="partNumber" required className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400" />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-fg-muted">Quantity</label>
                                    <input
                                        name="quantity"
                                        type="number"
                                        required
                                        min={0}
                                        defaultValue={1}
                                        className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-fg-muted">Vendor</label>
                                    <select name="vendorId" required defaultValue="" className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400">
                                        <option value="" disabled>
                                            Select
                                        </option>
                                        {vendors.map((vendor) => (
                                            <option key={vendor.id} value={vendor.id}>
                                                {vendor.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-fg-muted">Location</label>
                                    <select name="locationId" defaultValue="" className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400">
                                        <option value="">Not Set</option>
                                        {locations.map((location) => (
                                            <option key={location.id} value={location.id}>
                                                {locationLabel(location, locations)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <ItemFieldInputs fields={itemFields} nameTemplate={nameTemplate} />
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-fg">Part Number</label>
                                <input name="partNumber" required className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg" />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-fg">Description</label>
                                <textarea name="description" rows={3} className="w-full resize-none rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg" />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-fg">Quantity</label>
                                    <input name="quantity" type="number" required min={0} defaultValue={1} className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg" />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-fg">Vendor</label>
                                    <select name="vendorId" required defaultValue="" className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg">
                                        <option value="" disabled>
                                            Select
                                        </option>
                                        {vendors.map((vendor) => (
                                            <option key={vendor.id} value={vendor.id}>
                                                {vendor.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-fg">Location</label>
                                <select name="locationId" defaultValue="" className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg">
                                    <option value="">Not Set</option>
                                    {locations.map((location) => (
                                        <option key={location.id} value={location.id}>
                                            {locationLabel(location, locations)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {state?.error && <p className="text-sm text-accent">{state.error}</p>}

                    <div className="border-t border-border pt-4">
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
                                Cancel
                            </button>
                            <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60">
                                {pending ? "Adding..." : "Add Part"}
                            </button>
                        </div>
                    </div>
                </form>
            </Window>
        </>
    );
}

type ItemActionsMenuProps = {
    item: ItemData;
    categoryId: number;
    vendors: VendorOption[];
    locations: LocationOption[];
    nameTemplate: string | null;
    itemFields: ItemFieldDefinitionData[];
};

export function ItemActionsMenu({ item, categoryId, vendors, locations, nameTemplate, itemFields }: ItemActionsMenuProps) {
    const [window, setWindow] = useState<"edit" | "adjust" | "delete" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function closeWindow() {
        setError(null);
        setWindow(null);
    }

    return (
        <>
            <ActionMenu>
                <button type="button" className={actionMenuItemCSS} onClick={() => setWindow("edit")}>
                    Edit Part
                </button>
                <button type="button" className={actionMenuItemCSS} onClick={() => setWindow("adjust")}>
                    {" "}
                    Adjust Quantity
                </button>
                <button type="button" className={dangerousActionMenuItemCSS} onClick={() => setWindow("delete")}>
                    Delete Part
                </button>
            </ActionMenu>

            <Window open={window === "edit"} onClose={closeWindow} title="Edit Part" description={item.name} size={itemFields.length > 0 ? "lg" : "md"}>
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();

                        const formData = new FormData(event.currentTarget);

                        startTransition(async () => {
                            const result = await editItem(item.id, categoryId, undefined, formData);

                            if (result?.error) {
                                setError(result.error);
                                return;
                            }

                            closeWindow();
                        });
                    }}
                >
                    {itemFields.length > 0 ? (
                        <>
                            <ItemFieldInputs fields={itemFields} nameTemplate={nameTemplate} initialName={item.name} initialValues={item.itemFieldValues} />
                            <div className="space-y-2">
                                <label htmlFor={`edit-part-number-${item.id}`} className="block text-sm font-medium text-fg-muted">
                                    Part Number
                                </label>
                                <input
                                    id={`edit-part-number-${item.id}`}
                                    name="partNumber"
                                    required
                                    defaultValue={item.partNumber}
                                    className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor={`edit-description-${item.id}`} className="block text-sm font-medium text-fg-muted">
                                    Description
                                </label>
                                <textarea
                                    id={`edit-description-${item.id}`}
                                    name="description"
                                    rows={3}
                                    defaultValue={item.description}
                                    className="w-full resize-none rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label htmlFor={`edit-vendor-${item.id}`} className="block text-sm font-medium text-fg-muted">
                                        Vendor
                                    </label>
                                    <select
                                        id={`edit-vendor-${item.id}`}
                                        name="vendorId"
                                        required
                                        defaultValue={item.vendorId}
                                        className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400"
                                    >
                                        {vendors.map((vendor) => (
                                            <option key={vendor.id} value={vendor.id}>
                                                {vendor.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor={`edit-location-${item.id}`} className="block text-sm font-medium text-fg-muted">
                                        Location
                                    </label>
                                    <select
                                        id={`edit-location-${item.id}`}
                                        name="locationId"
                                        defaultValue={item.locationId ?? ""}
                                        className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400"
                                    >
                                        <option value="">Not Set</option>
                                        {locations.map((location) => (
                                            <option key={location.id} value={location.id}>
                                                {locationLabel(location, locations)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <ItemFieldInputs fields={itemFields} nameTemplate={nameTemplate} initialName={item.name} initialValues={item.itemFieldValues} />
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-fg">Part Number</label>
                                <input name="partNumber" required defaultValue={item.partNumber} className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-fg">Description</label>
                                <textarea name="description" rows={3} defaultValue={item.description} className="w-full resize-none rounded-md border bg-input px-3 py-2.5 text-sm text-fg" />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-fg">Vendor</label>
                                <select name="vendorId" required defaultValue={item.vendorId} className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg">
                                    {vendors.map((vendor) => (
                                        <option key={vendor.id} value={vendor.id}>
                                            {vendor.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-fg">Location</label>
                                <select name="locationId" defaultValue={item.locationId ?? ""} className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg">
                                    <option value="">Not Set</option>
                                    {locations.map((location) => (
                                        <option key={location.id} value={location.id}>
                                            {locationLabel(location, locations)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {error && <p className="text-sm text-accent">{error}</p>}

                    <div className="border-t border-border pt-4">
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={closeWindow} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
                                Cancel
                            </button>
                            <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60">
                                {pending ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </form>
            </Window>

            {/*<Window open={window === "adjust"} onClose={closeWindow} title="Adjust Quantity" description={`${item.name} currently has ${item.quantity} total.`}>*/}
            <Window open={window === "adjust"} onClose={closeWindow} title="Adjust Quantity">
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();

                        const formData = new FormData(event.currentTarget);

                        startTransition(async () => {
                            const result = await adjustItemQuantity(item.id, categoryId, undefined, formData);

                            if (result?.error) {
                                setError(result.error);
                                return;
                            }

                            closeWindow();
                        });
                    }}
                >
                    <div className="space-y-2">
                        <label htmlFor={`quantity-adjustment-${item.id}`} className="block text-sm font-medium text-fg">
                            Adjustment (currently have {item.quantity} in stock)
                        </label>
                        <input
                            id={`quantity-adjustment-${item.id}`}
                            name="quantityDelta"
                            type="number"
                            required
                            placeholder="+4 or -2"
                            className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-dim transition-colors focus:border-gray-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor={`quantity-reason-${item.id}`} className="block text-sm font-medium text-fg">
                            Reason
                        </label>
                        <textarea
                            id={`quantity-reason-${item.id}`}
                            name="reason"
                            rows={3}
                            placeholder="New shipment, damaged part, inventory correction..."
                            className="w-full resize-none rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-dim transition-colors focus:border-gray-400"
                        />
                    </div>

                    {error && <p className="text-sm text-accent">{error}</p>}

                    <div className="border-t border-border pt-4">
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={closeWindow} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted transition-colors hover:text-fg">
                                Cancel
                            </button>
                            <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60">
                                {pending ? "Adjusting..." : "Apply Adjustment"}
                            </button>
                        </div>
                    </div>
                </form>
            </Window>

            <Window open={window === "delete"} onClose={closeWindow} title="Delete Part" description={`Delete ${item.name}?`}>
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();

                        const formData = new FormData(event.currentTarget);

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

                    {error && <p className="text-sm text-accent">{error}</p>}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={closeWindow} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted">
                            Cancel
                        </button>
                        <button disabled={pending} className="rounded-md border border-accent/50 px-4 py-2 text-sm text-accent hover:bg-accent/10 disabled:opacity-60">
                            {pending ? "Deleting..." : "Delete Part"}
                        </button>
                    </div>
                </form>
            </Window>
        </>
    );
}

type DraftField = {
    clientId: string;
    id?: number;
    key: string;
    label: string;
    type: ItemFieldType;
    required: boolean;
    unit: string;
    optionsText: string;
    valueCount: number;
};

type ItemFieldConfigurationFormProps = {
    categoryId: number;
    nameTemplate: string | null;
    fields: ItemFieldDefinitionData[];
    onSaved: () => void;
    onCancel: () => void;
};

function makeKey(label: string): string {
    return label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .replace(/^[^a-z]+/, "");
}

export function ItemFieldConfigurationForm({ categoryId, nameTemplate: initialNameTemplate, fields: initialFields, onSaved, onCancel }: ItemFieldConfigurationFormProps) {
    const nextId = useRef(0);
    const [nameTemplate, setNameTemplate] = useState(initialNameTemplate ?? "");
    const [fields, setFields] = useState<DraftField[]>(() =>
        initialFields.map((field) => ({
            clientId: `existing-${field.id}`,
            id: field.id,
            key: field.key,
            label: field.label,
            type: field.type,
            required: field.required,
            unit: field.unit ?? "",
            optionsText: field.options.join(", "),
            valueCount: field.valueCount ?? 0,
        }))
    );

    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const placeholders = useMemo(() => fields.filter((field) => field.key).map((field) => `{${field.key}}`), [fields]);

    function updateField(clientId: string, update: Partial<DraftField>) {
        setFields((current) => current.map((field) => (field.clientId === clientId ? { ...field, ...update } : field)));
    }

    function addField() {
        const clientId = `new-${nextId.current++}`;

        setFields((current) => [
            ...current,
            {
                clientId,
                key: "",
                label: "",
                type: "TEXT",
                required: false,
                unit: "",
                optionsText: "",
                valueCount: 0,
            },
        ]);
    }

    return (
        <form
            className="space-y-5"
            onSubmit={(event) => {
                event.preventDefault();

                setError(null);

                const configuration = {
                    nameTemplate,
                    fields: fields.map((field) => ({
                        id: field.id,
                        key: field.key,
                        label: field.label,
                        type: field.type,
                        required: field.required,
                        unit: field.unit || null,
                        options:
                            field.type === "SELECT"
                                ? field.optionsText
                                      .split(",")
                                      .map((option) => option.trim())
                                      .filter(Boolean)
                                : [],
                    })),
                };

                const formData = new FormData();
                formData.set("configuration", JSON.stringify(configuration));

                startTransition(async () => {
                    const result = await savePartFieldConfiguration(categoryId, undefined, formData);

                    if (result?.error) {
                        setError(result.error);
                        return;
                    }

                    onSaved();
                });
            }}
        >
            <div className="space-y-2">
                <label htmlFor={`name-template-${categoryId}`} className="block text-sm font-medium text-fg">
                    Generated Name Format
                </label>
                <input
                    id={`name-template-${categoryId}`}
                    value={nameTemplate}
                    onChange={(event) => setNameTemplate(event.currentTarget.value)}
                    placeholder="{profile} {teeth} × {width} Belt"
                    className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-border-focus"
                />

                <p className="text-xs text-fg-muted">Leave this blank to keep entering part names manually. Field units are appended automatically.</p>
                {placeholders.length > 0 && <p className="text-xs text-fg-dim">Available fields: {placeholders.join("  ")}</p>}
            </div>

            <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-fg">Custom Fields</h3>
                        <p className="mt-1 text-xs text-fg-muted">These fields appear when adding or editing a part in this subcategory.</p>
                    </div>

                    <button
                        type="button"
                        onClick={addField}
                        className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-fg-muted transition-colors hover:border-border-focus hover:text-fg"
                    >
                        <Plus size={15} />
                        Add Field
                    </button>
                </div>

                {fields.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-fg-dim">No custom fields configured.</div>
                ) : (
                    <div className="space-y-3">
                        {fields.map((field) => (
                            <div key={field.clientId} className="rounded-md border border-border bg-input/40 p-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-fg-muted">Label</label>
                                        <input
                                            value={field.label}
                                            onChange={(event) => {
                                                const label = event.currentTarget.value;

                                                updateField(field.clientId, {
                                                    label,
                                                    ...(field.id === undefined ? { key: makeKey(label) } : {}),
                                                });
                                            }}
                                            placeholder="Width"
                                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-border-focus"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-fg-muted">Key</label>
                                        <input
                                            value={field.key}
                                            readOnly={field.id !== undefined}
                                            onChange={(event) =>
                                                updateField(field.clientId, {
                                                    key: makeKey(event.currentTarget.value),
                                                })
                                            }
                                            placeholder="width"
                                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-border-focus read-only:cursor-not-allowed read-only:text-fg-dim"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-fg-muted">Data Type</label>
                                        <select
                                            value={field.type}
                                            disabled={field.valueCount > 0}
                                            onChange={(event) =>
                                                updateField(field.clientId, {
                                                    type: event.currentTarget.value as ItemFieldType,
                                                })
                                            }
                                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-fg outline-none focus:border-border-focus disabled:cursor-not-allowed disabled:text-fg-dim"
                                        >
                                            <option value="TEXT">Text</option>
                                            <option value="INTEGER">Integer</option>
                                            <option value="DECIMAL">Decimal</option>
                                            <option value="SELECT">Select</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-fg-muted">Unit / Suffix</label>
                                        <input
                                            value={field.unit}
                                            onChange={(event) =>
                                                updateField(field.clientId, {
                                                    unit: event.currentTarget.value,
                                                })
                                            }
                                            placeholder="mm, T, in..."
                                            maxLength={12}
                                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-border-focus"
                                        />
                                    </div>
                                </div>

                                {field.type === "SELECT" && (
                                    <div className="mt-3 space-y-1.5">
                                        <label className="text-xs font-medium text-fg-muted">Options</label>
                                        <input
                                            value={field.optionsText}
                                            onChange={(event) =>
                                                updateField(field.clientId, {
                                                    optionsText: event.currentTarget.value,
                                                })
                                            }
                                            placeholder="HTD 5M, HTD 3M, GT2, GT3, XL"
                                            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-dim focus:border-border-focus"
                                        />

                                        <p className="text-xs text-fg-dim">Separate options with commas.</p>
                                    </div>
                                )}

                                <div className="mt-3 flex items-center justify-between gap-4">
                                    <label className="flex items-center gap-2 text-sm text-fg-muted">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(event) =>
                                                updateField(field.clientId, {
                                                    required: event.currentTarget.checked,
                                                })
                                            }
                                            className="h-4 w-4 accent-accent"
                                        />
                                        Required
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setFields((current) => current.filter((candidate) => candidate.clientId !== field.clientId))}
                                        className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-accent transition-colors hover:bg-accent/10"
                                    >
                                        <Trash2 size={15} />
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {error && (
                <p role="alert" className="text-sm text-accent">
                    {error}
                </p>
            )}

            <p className="text-xs text-fg-dim"> Existing parts are not renamed automatically when this configuration changes. Their name is regenerated the next time they areedited.</p>
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={pending}
                    className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Cancel
                </button>

                <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">
                    {pending ? "Saving..." : "Save Configuration"}
                </button>
            </div>
        </form>
    );
}

type ItemFieldInputsProps = {
    fields: ItemFieldDefinitionData[];
    nameTemplate: string | null;
    initialName?: string;
    initialValues?: ItemFieldValueData[];
};

export function ItemFieldInputs({ fields, nameTemplate, initialName = "", initialValues = [] }: ItemFieldInputsProps) {
    const initialValueMap = useMemo(() => Object.fromEntries(initialValues.map((value) => [value.fieldDefinitionId, value.value])), [initialValues]);
    const [values, setValues] = useState<Record<number, string>>(initialValueMap);
    const generatedName = nameTemplate ? buildItemNamePreview(nameTemplate, fields, values) : null;

    const fieldRows = [];
    for (let index = 0; index < fields.length; index += 3) {
        fieldRows.push(fields.slice(index, index + 3));
    }

    return (
        <>
            {fields.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Part Details</p>
                    </div>

                    <div className="space-y-4">
                        {fieldRows.map((row, rowIndex) => {
                            const columns = row.length === 1 ? "grid-cols-1" : row.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3";

                            return (
                                <div key={rowIndex} className={`grid gap-4 ${columns}`}>
                                    {row.map((field) => {
                                        const value = values[field.id] ?? "";
                                        const label = field.unit ? `${field.label} (${field.unit})` : field.label;

                                        return (
                                            <div key={field.id} className="min-w-0 space-y-2">
                                                <label htmlFor={itemFieldInputName(field.id)} className="block text-sm font-medium text-fg-muted">
                                                    {label}
                                                </label>
                                                {field.type === "SELECT" ? (
                                                    <select
                                                        id={itemFieldInputName(field.id)}
                                                        name={itemFieldInputName(field.id)}
                                                        required={field.required}
                                                        value={value}
                                                        onChange={(event) => {
                                                            const value = event.currentTarget.value;

                                                            setValues((current) => ({
                                                                ...current,
                                                                [field.id]: value,
                                                            }));
                                                        }}
                                                        className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400"
                                                    >
                                                        <option value="">{field.required ? "Select" : "Not Set"}</option>
                                                        {field.options.map((option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        id={itemFieldInputName(field.id)}
                                                        name={itemFieldInputName(field.id)}
                                                        type={field.type === "TEXT" ? "text" : "number"}
                                                        step={field.type === "DECIMAL" ? "any" : field.type === "INTEGER" ? "1" : undefined}
                                                        required={field.required}
                                                        value={value}
                                                        onChange={(event) => {
                                                            const value = event.currentTarget.value;

                                                            setValues((current) => ({
                                                                ...current,
                                                                [field.id]: value,
                                                            }));
                                                        }}
                                                        className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {nameTemplate ? (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-fg-muted">Generated Part Name</label>
                    <div className={`min-h-10 rounded-md border border-dashed border-border bg-input/40 px-3 py-2.5 text-sm ${generatedName?.complete && generatedName.name ? "text-fg" : "text-fg-dim"}`}>
                        {generatedName?.name || "Complete the part details to generate a name."}
                    </div>

                    <input type="hidden" name="name" value={generatedName?.name ?? ""} />
                </div>
            ) : (
                <div className="space-y-2">
                    <label htmlFor="part-name" className="block text-sm font-medium text-fg">
                        Part Name
                    </label>
                    <input id="part-name" name="name" required defaultValue={initialName} className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none focus:border-border-focus" />
                </div>
            )}
        </>
    );
}
