"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Dropdown from "@/components/ui/dropdown";
import SearchInput from "@/components/ui/search-input";
import Link from "next/link";

type VendorOption = { id: number; name: string };
type LocationOption = { id: number; name: string; parentId: number | null };
type InventoryToolbarProps = { vendors: VendorOption[]; locations: LocationOption[] };

function locationLabel(location: LocationOption, locations: LocationOption[]): string {
    const parent = locations.find((candidate) => candidate.id === location.parentId);

    if (!parent) return location.name;

    return `${parent.name} / ${location.name}`;
}

function searchLocationLabel(item: InventorySearchResult): string {
    if (!item.location) return "Not set";
    if (item.location.parent) return `${item.location.parent.name} / ${item.location.name}`;

    return item.location.name;
}

function InventorySearchField({ initialValue, replaceQuery }: { initialValue: string; replaceQuery: (query: string) => void }) {
    const [value, setValue] = useState(initialValue);

    return (
        <form
            className="relative min-w-0 flex-1"
            onSubmit={(event) => {
                event.preventDefault();
                replaceQuery(value);
            }}
        >
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
            <SearchInput value={value} onChange={setValue} placeholder="Search by part name or part number..." ariaLabel="Search inventory" className="w-full pl-10" />
        </form>
    );
}

export function InventoryToolbar({ vendors, locations }: InventoryToolbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams.get("q") ?? "";
    const vendor = searchParams.get("vendor") ?? "";
    const location = searchParams.get("location") ?? "";
    const activeFilterCount = Number(Boolean(vendor)) + Number(Boolean(location));

    function replaceParams(changes: Record<string, string | null>) {
        const params = new URLSearchParams(window.location.search);

        for (const [key, value] of Object.entries(changes)) {
            const normalized = value?.trim() ?? "";

            if (normalized) {
                params.set(key, normalized);
            } else {
                params.delete(key);
            }
        }

        const nextQuery = params.toString();

        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
            scroll: false,
        });
    }

    return (
        <div className="mb-8 flex w-full items-center gap-2">
            <InventorySearchField key={query} initialValue={query} replaceQuery={(nextQuery) => replaceParams({ q: nextQuery })} />
            <Dropdown
                align="right"
                menuClassName="w-72"
                trigger={({ open, toggle, menuId }) => (
                    <button
                        type="button"
                        onClick={toggle}
                        aria-haspopup="menu"
                        aria-expanded={open}
                        aria-controls={open ? menuId : undefined}
                        className={`inline-flex h-10.5 shrink-0 items-center gap-2 rounded-md border px-3.5 text-sm font-medium transition-colors ${
                            activeFilterCount > 0 ? "border-accent bg-accent/10 text-fg" : "border-border bg-card text-fg-muted hover:border-border-focus hover:text-fg"
                        }`}
                    >
                        <span className="hidden sm:inline">Filters</span>
                        <SlidersHorizontal size={18} />
                        {activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{activeFilterCount}</span>}
                    </button>
                )}
            >
                {() => (
                    <div role="group" aria-label="Inventory filters" className="space-y-4 p-3">
                        <div>
                            <p className="text-sm font-semibold text-fg">Filters</p>
                            <p className="mt-1 text-xs text-fg-muted">Narrow the parts shown in the current inventory section.</p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="inventory-vendor-filter" className="block text-xs font-medium text-fg-muted">
                                Vendor
                            </label>
                            <select
                                id="inventory-vendor-filter"
                                value={vendor}
                                onChange={(event) => replaceParams({ vendor: event.currentTarget.value || null })}
                                className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400"
                            >
                                <option value="">All Vendors</option>
                                {vendors.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="inventory-location-filter" className="block text-xs font-medium text-fg-muted">
                                Location
                            </label>
                            <select
                                id="inventory-location-filter"
                                value={location}
                                onChange={(event) => replaceParams({ location: event.currentTarget.value || null })}
                                className="w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-gray-400"
                            >
                                <option value="">All Locations</option>
                                <option value="none">Not Set</option>
                                {locations.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {locationLabel(option, locations)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={() => replaceParams({ vendor: null, location: null })}
                                className="w-full rounded-md border border-border px-3 py-2 text-sm text-fg-muted transition-colors hover:border-border-focus hover:text-fg"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}
            </Dropdown>
        </div>
    );
}

type InventorySearchResult = {
    id: number;
    name: string;
    partNumber: string;
    quantity: number;
    categoryId: number;
    category: {
        name: string;
        parent: { name: string } | null;
    };
    vendor: { name: string };
    location: {
        name: string;
        parent: { name: string } | null;
    } | null;
    checkouts: {
        quantityCheckedOut: number;
    }[];
};

type InventorySearchResultsProps = {
    items: InventorySearchResult[];
    queryString: string;
};

function categoryLabel(item: InventorySearchResult): string {
    if (item.category.parent) return `${item.category.parent.name} / ${item.category.name}`;
    return item.category.name;
}

export function InventorySearchResults({ items, queryString }: InventorySearchResultsProps) {
    if (items.length === 0) {
        return <p className="rounded-lg border border-border bg-card px-5 py-8 text-center text-sm text-fg-muted">No parts match your search or filters.</p>;
    }

    return (
        <section>
            <p className="mb-3 text-sm text-fg-muted">
                {items.length} {items.length === 1 ? "part" : "parts"} found
            </p>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                {items.map((item) => {
                    const used = item.checkouts.reduce((total, checkout) => total + checkout.quantityCheckedOut, 0);
                    const available = item.quantity - used;
                    const href = queryString ? `/inventory/${item.categoryId}?${queryString}` : `/inventory/${item.categoryId}`;

                    return (
                        <Link key={item.id} href={href} className="block border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-input/60">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                        <h2 className="font-medium text-fg">{item.name}</h2>
                                        <span className="text-sm text-fg-muted">{item.partNumber}</span>
                                    </div>

                                    <p className="mt-1 text-xs text-fg-dim">{categoryLabel(item)}</p>
                                    <p className="mt-2 text-xs text-fg-muted">
                                        {item.vendor.name}
                                        <span className="px-1 text-fg-dim">•</span>
                                        {searchLocationLabel(item)}
                                    </p>
                                </div>

                                <div className="flex shrink-0 gap-5 text-xs sm:text-right">
                                    <div>
                                        <p className="uppercase tracking-wide text-fg-dim">Total</p>
                                        <p className="mt-1 font-semibold text-fg">{item.quantity}</p>
                                    </div>

                                    <div>
                                        <p className="uppercase tracking-wide text-fg-dim">Used</p>
                                        <p className="mt-1 font-semibold text-fg">{used}</p>
                                    </div>

                                    <div>
                                        <p className="uppercase tracking-wide text-fg-dim">Available</p>
                                        <p className="mt-1 font-semibold text-fg">{available}</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
