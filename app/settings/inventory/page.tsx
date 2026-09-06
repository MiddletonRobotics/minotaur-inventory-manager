import { redirect } from "next/navigation";
import { CreateCategoryForm, DeleteCategoryButton, SubcategoryActionsMenu } from "@/components/category-management";
import { authenticate } from "@/server/session";
import prisma from "@/prisma/prisma";

export default async function InventorySettings() {
    const session = await authenticate();

    if (!session) {
        redirect("/login");
    }

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") {
        redirect("/");
    }

    const categories = await prisma.category.findMany({
        where: { parentId: null },
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: {
                    children: true,
                    items: true,
                },
            },
            children: {
                orderBy: { name: "asc" },
                include: {
                    _count: {
                        select: {
                            children: true,
                            items: true,
                        },
                    },
                },
            },
        },
    });

    const parentCategories = categories.map((category) => ({ id: category.id, name: category.name }));
    const subcategories = categories.flatMap((category) => category.children.map((subcategory) => ({ id: subcategory.id, name: subcategory.name, parentName: category.name })));

    return (
        <section className="min-w-0 flex-1">
            <div className="border-b border-border pb-6">
                <h2 className="text-2xl font-semibold text-fg">Inventory</h2>
                <p className="mt-1 text-sm text-fg-muted">Create and manage inventory categories.</p>
            </div>

            <section className="border-b border-border py-8">
                <h3 className="text-lg font-semibold text-fg">Create Category</h3>
                <p className="mt-1 text-sm text-fg-muted">Create a top-level category or add a subcategory to an existing category.</p>

                <div className="max-w-xl">
                    <CreateCategoryForm parentCategories={parentCategories} />
                </div>
            </section>

            <section className="py-8">
                <div>
                    <h3 className="text-lg font-semibold text-fg">Existing Categories</h3>
                    <p className="mt-1 text-sm text-fg-muted">
                        {categories.length} top-level {categories.length === 1 ? "category" : "categories"}
                    </p>
                </div>

                {categories.length === 0 ? (
                    <p className="mt-6 text-sm text-fg-dim">There are currently no inventory categories.</p>
                ) : (
                    <div className="mt-6">
                        {categories.map((category) => (
                            <div key={category.id} className="py-5">
                                <div className="flex items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-medium text-fg">{category.name}</p>
                                            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted">Category</span>
                                        </div>

                                        <p className="mt-1 text-xs text-fg-dim">
                                            {category._count.children} {category._count.children === 1 ? "subcategory" : "subcategories"}
                                        </p>
                                    </div>

                                    <DeleteCategoryButton categoryId={category.id} categoryName={category.name} disabled={category._count.children > 0 || category._count.items > 0} />
                                </div>

                                {category.children.length > 0 && (
                                    <div className="ml-6 mt-4 border-l border-border pl-5">
                                        {category.children.map((subcategory) => (
                                            <div key={subcategory.id} className="flex items-center justify-between gap-6 py-3">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-sm text-fg">{subcategory.name}</p>
                                                        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted">Subcategory</span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-fg-dim">
                                                        {subcategory._count.items} {subcategory._count.items === 1 ? "item" : "items"}
                                                    </p>
                                                </div>

                                                <SubcategoryActionsMenu
                                                    subcategoryId={subcategory.id}
                                                    subcategoryName={subcategory.name}
                                                    currentParentId={category.id}
                                                    itemCount={subcategory._count.items}
                                                    parentCategories={parentCategories}
                                                    subcategories={subcategories}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}
