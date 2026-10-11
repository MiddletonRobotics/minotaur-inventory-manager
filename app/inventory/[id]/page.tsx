import Link from "next/link";
import { notFound } from "next/navigation";
import { InventorySearchResults, InventoryToolbar } from "@/components/inventory-management";
import { AddItemButton, ItemActionsMenu } from "@/components/item-management";
import Navbar from "@/components/navbar";
import { hasInventorySearch, buildInventorySearchQueryString, parseInventorySearchParams, type InventorySearchParams } from "@/lib/inventorySearch";
import prisma from "@/prisma/prisma";
import { buildItemSearchWhere, getItemSearchFilterOptions, searchItems } from "@/server/search";
import { authenticate } from "@/server/session";

type InventoryCategoryPageProps = {
    params: Promise<{id: string}>;
    searchParams: Promise<InventorySearchParams>;
};

export default async function InventoryCategoryPage({ params, searchParams }: InventoryCategoryPageProps) {
    const [{ id }, rawSearchParams] = await Promise.all([params, searchParams]);
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId)) notFound();

    const filters = parseInventorySearchParams(rawSearchParams);
    const searching = hasInventorySearch(filters);
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
            parent: true,
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
            itemFields: {
                where: { active: true }, 
                orderBy: { sortOrder: "asc" },
            },
        },
    });

    if (!category) notFound();

    const [session, filterOptions ] = await Promise.all([authenticate(), getItemSearchFilterOptions()]);
    const [vendors, locations] = filterOptions;
    const isSubcategory = category.parentId !== null;
    const canManageInventory = session?.user.role === "MANAGER" || session?.user.role === "ADMINISTRATOR";
    const itemFields = category.itemFields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required,
        unit: field.unit,
        options: Array.isArray(field.options) ? field.options.filter((option): option is string => typeof option === "string") : [],
        sortOrder: field.sortOrder,
    }));

    const [items, searchResults] = await Promise.all([
        isSubcategory ? prisma.item.findMany({
            where: buildItemSearchWhere({
                query: filters.query || undefined,
                vendorId: filters.vendorId ?? undefined,
                locationId: filters.locationId ?? undefined,
                locationUnset: filters.locationUnset,
                scope: {
                    type: "SUBCATEGORY",
                    categoryId,
                },
            }),
            orderBy: [{
                name: "asc",
            },
            {
                partNumber: "asc",
            }],
            include: {
                vendor: true,
                location: {
                    include: { parent: true },
                },
                checkouts: {
                    where: {
                        project:  {
                            status: "ACTIVE",
                        },
                    },
                    select: {
                        quantityCheckedOut: true,
                    },
                },
                itemFieldValues: {
                    select: {
                        fieldDefinitionId: true,
                        value: true,
                    },
                },
            },
        }) : Promise.resolve([]), !isSubcategory && searching ? searchItems({
            query: filters.query || undefined,
            vendorId: filters.vendorId ?? undefined,
            locationId: filters.locationId ?? undefined,
            locationUnset: filters.locationUnset,
            scope: {
                type: "CATEGORY",
                categoryId,
            },
        }) : Promise.resolve([])
    ]);

    return (
        <>
            <Navbar />
            <main className="min-h-[calc(100vh-64px)] w-full px-4 py-10 font-bricolage sm:px-8">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-8 flex items-center gap-2 text-sm text-fg-muted">
                        <Link href="/inventory" className="transition-colors hover:text-fg">Inventory</Link>
                        {category.parent ? (
                            <>
                                <span>/</span>
                                <Link href={`/inventory/${category.parent.id}`} className="transition-colors hover:text-fg">{category.parent.name}</Link>
                            </>
                        ) : null}

                        <span>/</span>
                        <span className="text-fg">{category.name}</span>
                    </div>

                    <h1 className="mb-10 text-center text-4xl font-black uppercase tracking-widest text-fg">{category.name}</h1>
                    <InventoryToolbar vendors={vendors} locations={locations} />
                    {!isSubcategory && searching ? (
                        <InventorySearchResults items={searchResults} queryString={buildInventorySearchQueryString(filters)} />
                    ) : !isSubcategory ? (
                        category.children.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-5">
                                {category.children.map((child) => (
                                    <Link
                                        key={child.id}
                                        href={`/inventory/${child.id}`}
                                        className="group flex min-h-36 w-full flex-col justify-between bg-accent p-5 text-fg transition-colors hover:bg-accent-hover sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]"
                                    >
                                        <div>
                                            <h3 className="text-lg font-semibold uppercase tracking-wide">{child.name}</h3>
                                            <p className="mt-2 text-xs text-fg/70">{child._count.children > 0 ? `${child._count.children} subcategories` : `${child._count.items} parts`}</p>
                                        </div>

                                        <p className="text-xs font-medium uppercase tracking-wide">View Parts</p>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-sm text-fg-muted">This category does not have any subcategories yet.</p>
                        )
                    ) : (
                        <>
                            {canManageInventory && (
                                <div className="mb-4">
                                    <AddItemButton categoryId={category.id} categoryName={category.name} vendors={vendors} locations={locations}  nameTemplate={category.nameTemplate} itemFields={itemFields} />
                                </div>
                            )}

                            {items.length > 0 ? (
                                <div className="overflow-hidden rounded-xl border border-border bg-card">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead className="border-b border-border text-xs uppercase tracking-wide text-fg-muted">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold">Part</th>
                                                <th className="px-4 py-3 font-semibold">Part Number</th>
                                                <th className="px-4 py-3 font-semibold">Vendor</th>
                                                <th className="px-4 py-3 font-semibold">Location</th>
                                                <th className="px-4 py-3 font-semibold">Total</th>
                                                <th className="px-4 py-3 font-semibold">Used</th>
                                                <th className="px-4 py-3 font-semibold">Available</th>
                                                {canManageInventory && (
                                                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {items.map((item) => {
                                                const checkedOut = item.checkouts.reduce((total, checkout) => total + checkout.quantityCheckedOut, 0);
                                                const available = item.quantity - checkedOut;

                                                return (
                                                    <tr key={item.id} className="border-b border-border last:border-b-0">
                                                        <td className="px-4 py-3 text-fg">
                                                            <div className="font-medium">{item.name}</div>
                                                            <div className="mt-1 text-xs text-fg-muted">{item.description}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-fg-muted">{item.partNumber}</td>
                                                        <td className="px-4 py-3 text-fg-muted">{item.vendor.name}</td>
                                                        <td className="px-4 py-3 text-fg-muted">{item.location ? item.location.parent ? `${item.location.parent.name} / ${item.location.name}` : item.location.name : "Not set"}</td>
                                                        <td className="px-4 py-3 text-fg-muted">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-fg-muted">{checkedOut}</td>
                                                        <td className="px-4 py-3 font-semibold text-fg">{available}</td>

                                                        {canManageInventory && (
                                                            <td className="px-4 py-3 text-right">
                                                                <ItemActionsMenu
                                                                    item={{
                                                                        id: item.id,
                                                                        name: item.name,
                                                                        partNumber: item.partNumber,
                                                                        description: item.description,
                                                                        quantity: item.quantity,
                                                                        vendorId: item.vendorId,
                                                                        locationId: item.locationId,
                                                                        itemFieldValues: item.itemFieldValues,
                                                                    }}
                                                                    categoryId={category.id}
                                                                    vendors={vendors}
                                                                    locations={locations}
                                                                    nameTemplate={category.nameTemplate}
                                                                    itemFields={itemFields}
                                                                />
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : searching ? (
                                <p className="rounded-lg border border-border bg-card px-5 py-8 text-center text-sm text-fg-muted">No parts match your search or filters.</p>
                            ) : (
                                <p className="text-center text-sm text-fg-muted">This subcategory does not have any parts yet.</p>
                            )}
                        </>
                    )}
                </div>
            </main>
        </>
    );
}