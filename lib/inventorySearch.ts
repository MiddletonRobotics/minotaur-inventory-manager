export type InventorySearchParams = {
    q?: string | string[];
    vendor?: string | string[];
    location?: string | string[];
};

export type InventorySearchState = {
    query: string;
    vendorId: number | null;
    locationId: number | null;
    locationUnset: boolean;
};

function firstValue(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
}

function parsePositiveInteger(value: string): number | null {
    if (!/^\d+$/.test(value)) return null;

    const number = Number(value);

    if (!Number.isSafeInteger(number) || number <= 0) return null;

    return number;
}

export function parseInventorySearchParams(searchParams: InventorySearchParams): InventorySearchState {
    const location = firstValue(searchParams.location);

    return {
        query: firstValue(searchParams.q).trim(),
        vendorId: parsePositiveInteger(firstValue(searchParams.vendor)),
        locationId: location === "none" ? null : parsePositiveInteger(location),
        locationUnset: location === "none",
    };
}

export function hasInventorySearch(state: InventorySearchState): boolean {
    return Boolean(state.query || state.vendorId || state.locationId || state.locationUnset);
}

export function buildInventorySearchQueryString(state: InventorySearchState): string {
    const params = new URLSearchParams();

    if (state.query) params.set("q", state.query);
    if (state.vendorId) params.set("vendor", String(state.vendorId));
    if (state.locationUnset) {
        params.set("location", "none");
    } else if (state.locationId) {
        params.set("location", String(state.locationId));
    }

    return params.toString();
}
