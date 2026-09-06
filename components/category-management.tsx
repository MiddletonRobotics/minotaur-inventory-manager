"use client";

import { useActionState, useTransition, useState } from "react";
import { createCategory, deleteAllItems, deleteCategory, moveAllItems, relocateSubcategory, type CategoryActionState } from "@/server/categories";
import ActionMenu, { actionMenuItemCSS, dangerousActionMenuItemCSS } from "@/components/action-menu";
import Window from "@/components/window";

type ParentCategory = { id: number; name: string };
type CreateCategoryFormProps = { parentCategories: ParentCategory[] };
type DeleteCategoryButtonProps = { categoryId: number; categoryName: string; disabled?: boolean };
type SubcategoryOption = { id: number; name: string; parentName: string };
type SubcategoryManagementControlsProps = {
    subcategoryId: number;
    subcategoryName: string;
    currentParentId: number;
    itemCount: number;
    parentCategories: ParentCategory[];
    subcategories: SubcategoryOption[];
};

export function CreateCategoryForm({ parentCategories }: CreateCategoryFormProps) {
    const [level, setLevel] = useState<"CATEGORY" | "SUBCATEGORY">("CATEGORY");
    const [state, formAction, pending] = useActionState<CategoryActionState, FormData>(createCategory, undefined);

    return (
        <form action={formAction} className="mt-6 space-y-5">
            <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-fg">
                    Name
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder={level === "CATEGORY" ? "Motors" : "Brushless Motors"}
                    className="w-full rounded-md border bg-input px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-fg-dim focus:border-border-focus"
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="level" className="block text-sm font-medium text-fg">
                    Type
                </label>

                <select
                    id="level"
                    name="level"
                    value={level}
                    onChange={(event) => setLevel(event.currentTarget.value as "CATEGORY" | "SUBCATEGORY")}
                    className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg outline-none focus:border-border-focus"
                >
                    <option value="CATEGORY">Category</option>
                    <option value="SUBCATEGORY">Subcategory</option>
                </select>
            </div>

            {level === "SUBCATEGORY" && (
                <div className="space-y-2">
                    <label htmlFor="parentId" className="block text-sm font-medium text-fg">
                        Parent Category
                    </label>

                    <select id="parentId" name="parentId" required defaultValue="" className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg outline-none focus:border-border-focus">
                        <option value="" disabled>
                            Select a category
                        </option>

                        {parentCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <p className="text-xs text-fg-muted">Inventory items can later be assigned to subcategories.</p>
                </div>
            )}

            {state?.error && (
                <p role="alert" className="text-sm text-accent">
                    {state.error}
                </p>
            )}

            {state?.success && <p className="text-sm text-fg-muted">{state.success}</p>}

            <button type="submit" disabled={pending} className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">
                {pending ? "Creating..." : "Create Category"}
            </button>
        </form>
    );
}

export function DeleteCategoryButton({ categoryId, categoryName, disabled = false }: DeleteCategoryButtonProps) {
    const deleteAction = deleteCategory.bind(null, categoryId);

    if (disabled) {
        return <span className="text-xs text-fg-dim">Not Empty</span>;
    }

    return (
        <form
            action={deleteAction}
            onSubmit={(event) => {
                const confirmed = window.confirm(`Delete ${categoryName}?`);

                if (!confirmed) {
                    event.preventDefault();
                }
            }}
        >
            <button type="submit" className="rounded-md border border-accent/50 px-3 py-1.5 text-sm text-accent transition-colors hover:border-accent hover:bg-accent/10">
                Delete
            </button>
        </form>
    );
}

export function SubcategoryActionsMenu({ subcategoryId, subcategoryName, currentParentId, itemCount, parentCategories, subcategories }: SubcategoryManagementControlsProps) {
    const [modal, setModal] = useState<"relocate" | "move" | "deleteParts" | null>(null);
    const deleteCategoryAction = deleteCategory.bind(null, subcategoryId);
    const otherParents = parentCategories.filter((category) => category.id !== currentParentId);
    const otherSubcategories = subcategories.filter((subcategory) => subcategory.id !== subcategoryId);
    const [relocateError, setRelocateError] = useState<string | null>(null);
    const [moveError, setMoveError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [relocating, startRelocating] = useTransition();
    const [moving, startMoving] = useTransition();
    const [deleting, startDeleting] = useTransition();

    return (
        <>
            <ActionMenu>
                <button type="button" className={actionMenuItemCSS} onClick={() => setModal("relocate")}>
                    Relocate
                </button>
                <button type="button" disabled={itemCount === 0} className={actionMenuItemCSS} onClick={() => setModal("move")}>
                    Move All Parts
                </button>
                <button type="button" disabled={itemCount === 0} className={dangerousActionMenuItemCSS} onClick={() => setModal("deleteParts")}>
                    Delete All Parts
                </button>

                <form
                    action={deleteCategoryAction}
                    onSubmit={(event) => {
                        if (itemCount > 0 || !window.confirm(`Delete ${subcategoryName}?`)) {
                            event.preventDefault();
                        }
                    }}
                >
                    <button type="submit" disabled={itemCount > 0} className={dangerousActionMenuItemCSS}>
                        Delete Subcategory
                    </button>
                </form>
            </ActionMenu>

            <Window open={modal === "relocate"} onClose={() => setModal(null)} title="Relocate Subcategory" description={`Move ${subcategoryName} under another parent category.`}>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);

                        startRelocating(async () => {
                            const result = await relocateSubcategory(subcategoryId, undefined, formData);

                            if (result?.error) {
                                setRelocateError(result.error);

                                return;
                            }

                            setRelocateError(null);
                            setModal(null);
                        });
                    }}
                    className="space-y-4"
                >
                    <select name="parentId" required defaultValue="" className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg outline-none focus:border-border-focus">
                        <option value="" disabled>
                            Select category
                        </option>

                        {otherParents.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    {relocateError && <p className="text-sm text-accent">{relocateError}</p>}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setModal(null)} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted">
                            Cancel
                        </button>
                        <button disabled={relocating} className="rounded-md bg-accent px-4 py-2 text-sm text-white">
                            Relocate
                        </button>
                    </div>
                </form>
            </Window>

            <Window open={modal === "move"} onClose={() => setModal(null)} title="Move All Parts" description={`Move every part currently stored in ${subcategoryName}.`}>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);

                        startMoving(async () => {
                            const result = await moveAllItems(subcategoryId, undefined, formData);

                            if (result?.error) {
                                setMoveError(result.error);

                                return;
                            }

                            setMoveError(null);
                            setModal(null);
                        });
                    }}
                    className="space-y-4"
                >
                    <select name="targetCategoryId" required defaultValue="" className="w-full rounded-md border bg-input px-3 py-2.5 text-sm text-fg outline-none focus:border-border-focus">
                        <option value="" disabled>
                            Select destination
                        </option>

                        {otherSubcategories.map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>
                                {subcategory.parentName} / {subcategory.name}
                            </option>
                        ))}
                    </select>

                    {moveError && <p className="text-sm text-accent">{moveError}</p>}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setModal(null)} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted">
                            Cancel
                        </button>
                        <button disabled={moving} className="rounded-md bg-accent px-4 py-2 text-sm text-white">
                            Move Parts
                        </button>
                    </div>
                </form>
            </Window>

            <Window open={modal === "deleteParts"} onClose={() => setModal(null)} title="Delete All Parts" description={`Permanently delete all ${itemCount} parts from ${subcategoryName}.`}>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);

                        startDeleting(async () => {
                            const result = await deleteAllItems(subcategoryId, undefined, formData);

                            if (result?.error) {
                                setDeleteError(result.error);

                                return;
                            }

                            setDeleteError(null);
                            setModal(null);
                        });
                    }}
                    className="space-y-4"
                >
                    {deleteError && <p className="text-sm text-accent">{deleteError}</p>}

                    <p className="text-sm text-fg-muted">This cannot be undone. Parts with project history cannot be deleted.</p>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setModal(null)} className="rounded-md border border-border px-4 py-2 text-sm text-fg-muted">
                            Cancel
                        </button>
                        <button disabled={deleting} className="rounded-md border border-accent/50 px-4 py-2 text-sm text-accent hover:bg-accent/10">
                            Delete All Parts
                        </button>
                    </div>
                </form>
            </Window>
        </>
    );
}
