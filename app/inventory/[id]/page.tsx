import Link from "next/link";
import { notFound } from "next/navigation";

import Navbar from "@/components/navbar";
import prisma from "@/prisma/prisma";

import { AddItemButton, ItemActionsMenu } from "@/components/item-management";
import { authenticate } from "@/server/session";

type InventoryCategoryPageProps = { params: Promise<{ id: string }> };

export default async function InventoryCategoryPage({ params }: InventoryCategoryPageProps) {
    const { id } = await params;
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId)) notFound();

    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
            parent: true,
            children: {
                orderBy: { name: "asc" },
                include: {
                    _count: {
                        select: { children: true, items: true },
                    },
                },
            },
            items: {
                orderBy: { name: "asc" },
                include: {
                    checkouts: {
                        where: {
                            project: { status: "ACTIVE" },
                        },
                        select: { quantityCheckedOut: true },
                    },
                },
            },
        },
    });

    if (!category) notFound();

    const session = await authenticate();
    const isSubcategory = category.parentId !== null;
    const canManageInventory = session?.user.role === "MANAGER" || session?.user.role === "ADMINISTRATOR";

    const locations =
        isSubcategory && canManageInventory
            ? await prisma.storageLocation.findMany({
                  orderBy: { name: "asc" },
              })
            : [];

    return (
        <>
            <Navbar />
            <main className="min-h-[calc(100vh-64px)] w-full px-4 py-10 font-bricolage sm:px-8">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-8 flex items-center gap-2 text-sm text-fg-muted">
                        <Link href="/inventory" className="transition-colors hover:text-fg">
                            Inventory
                        </Link>
                        {category.parent ? (
                            <>
                                <span>/</span>
                                <Link href={`/inventory/${category.parent.id}`} className="transition-colors hover:text-fg">
                                    {category.parent.name}
                                </Link>
                            </>
                        ) : null}

                        <span>/</span>
                        <span className="text-fg">{category.name}</span>
                    </div>

                    <h1 className="mb-10 text-center text-4xl font-black uppercase tracking-widest text-fg">{category.name}</h1>

                    {category.children.length > 0 ? (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {category.children.map((child) => (
                                <Link key={child.id} href={`/inventory/${child.id}`} className="group flex min-h-36 flex-col justify-between bg-accent p-5 text-fg transition-colors hover:bg-accent-hover">
                                    <div>
                                        <h3 className="text-lg font-semibold uppercase tracking-wide">{child.name}</h3>
                                        <p className="mt-2 text-xs text-fg/70">{child._count.children > 0 ? `${child._count.children} subcategories` : `${child._count.items} parts`}</p>
                                    </div>
                                    <p className="text-xs font-medium uppercase tracking-wide">View Parts</p>
                                </Link>
                            ))}
                        </div>
                    ) : null}

                    {isSubcategory && canManageInventory && (
                        <div className="mb-4">
                            <AddItemButton categoryId={category.id} categoryName={category.name} locations={locations} />
                        </div>
                    )}

                    {category.items.length > 0 ? (
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
                                        {canManageInventory && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
                                    </tr>
                                </thead>

                                <tbody>
                                    {category.items.map((item) => {
                                        const checkedOut = item.checkouts.reduce((total, checkout) => total + checkout.quantityCheckedOut, 0);
                                        const available = item.quantity - checkedOut;

                                        return (
                                            <tr key={item.id} className="border-b border-border">
                                                <td className="px-4 py-3 text-fg">
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="mt-1 text-xs text-fg-muted">{item.description}</div>
                                                </td>

                                                <td className="px-4 py-3 text-fg-muted">{item.partNumber}</td>
                                                <td className="px-4 py-3 text-fg-muted">{item.vendor}</td>
                                                <td className="px-4 py-3 text-fg-muted">{item.location ?? "Not set"}</td>
                                                <td className="px-4 py-3 text-fg-muted">{item.quantity}</td>
                                                <td className="px-4 py-3 text-fg-muted">{checkedOut}</td>
                                                <td className="px-4 py-3 font-semibold text-fg">{available}</td>
                                                {canManageInventory && (
                                                    <td className="px-4 py-3 text-right">
                                                        <ItemActionsMenu itemId={item.id} itemName={item.name} categoryId={category.id} />
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : null}

                    {category.children.length === 0 && category.items.length === 0 ? <p className="text-center text-sm text-fg-muted">This category does not have any subcategories or parts yet.</p> : null}
                </div>
            </main>
        </>
    );
}
