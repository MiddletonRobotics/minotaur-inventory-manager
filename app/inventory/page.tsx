import Link from "next/link";

import { buildInventorySearchQueryString, hasInventorySearch, parseInventorySearchParams, type InventorySearchParams } from "@/lib/inventorySearch";
import { InventorySearchResults, InventoryToolbar } from "@/components/inventory-management";
import { getItemSearchFilterOptions, searchItems } from "@/server/search";
import Navbar from "@/components/navbar";
import prisma from "@/prisma/prisma";

type InventoryPageProps = { searchParams: Promise<InventorySearchParams> };

export default async function Inventory({ searchParams }: InventoryPageProps) {
    const filters = parseInventorySearchParams(await searchParams);
    const searching = hasInventorySearch(filters);
    const [categories, filterOptions, searchResults] = await Promise.all([
        prisma.category.findMany({
            where: { parentId: null },
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: {
                        children: true,
                        items: true,
                    },
                },
            },
        }),

        getItemSearchFilterOptions(),

        searching
            ? searchItems({
                  query: filters.query || undefined,
                  vendorId: filters.vendorId ?? undefined,
                  locationId: filters.locationId ?? undefined,
                  locationUnset: filters.locationUnset,
                  scope: { type: "ALL" },
              })
            : Promise.resolve([]),
    ]);

    const [vendors, locations] = filterOptions;

    return (
        <>
            <Navbar />
            <main className="inventory-page">
                <div className="inventory-container">
                    <h1 className="inventory-title">Inventory</h1>
                    <InventoryToolbar vendors={vendors} locations={locations} />

                    {searching ? (
                        <InventorySearchResults items={searchResults} queryString={buildInventorySearchQueryString(filters)} />
                    ) : categories.length === 0 ? (
                        <p className="text-center text-sm text-fg-muted">There are currently no inventory categories.</p>
                    ) : (
                        <section className="flex flex-wrap justify-center gap-4">
                            {categories.map((category) => (
                                <Link key={category.id} href={`/inventory/${category.id}`} className="category-card w-full sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]">
                                    <div>
                                        <h2 className="text-lg font-semibold uppercase tracking-wide">{category.name}</h2>
                                        <p className="mt-2 text-xs text-fg/70">{category._count.children > 0 ? `${category._count.children} subcategories` : `${category._count.items} parts`}</p>
                                    </div>

                                    <p className="text-xs font-medium uppercase tracking-wide">View Parts</p>
                                </Link>
                            ))}
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}
