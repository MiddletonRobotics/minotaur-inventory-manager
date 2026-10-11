import "server-only";

import prisma from "@/prisma/prisma";
import type { Prisma } from "@/prisma/generated/client";

export type ItemSearchScope = { type: "ALL" } | { type: "CATEGORY"; categoryId: number } | { type: "SUBCATEGORY"; categoryId: number };

export type ItemSearchOptions = {
    query?: string;
    vendorId?: number;
    locationId?: number;
    locationUnset?: boolean;
    scope?: ItemSearchScope;
};

export function buildItemSearchWhere({ query, vendorId, locationId, locationUnset = false, scope = { type: "ALL" } }: ItemSearchOptions): Prisma.ItemWhereInput {
    const conditions: Prisma.ItemWhereInput[] = [];

    if (scope.type === "SUBCATEGORY") {
        conditions.push({
            OR: [
                {
                    categoryId: scope.categoryId,
                },
                {
                    category: {
                        parentId: scope.categoryId,
                    },
                },
            ],
        });
    }

    if (scope.type === "SUBCATEGORY") {
        conditions.push({
            categoryId: scope.categoryId,
        });
    }

    const trimmedQuery = query?.trim();

    if (trimmedQuery) {
        conditions.push({
            OR: [
                {
                    name: {
                        contains: trimmedQuery,
                        mode: "insensitive",
                    },
                },
                {
                    partNumber: {
                        contains: trimmedQuery,
                        mode: "insensitive",
                    },
                },
            ],
        });
    }

    if (vendorId) {
        conditions.push({
            vendorId,
        });
    }

    if (locationUnset) {
        conditions.push({
            locationId: null,
        });
    } else if (locationId) {
        conditions.push({
            OR: [
                {
                    locationId,
                },
                {
                    location: {
                        parentId: locationId,
                    },
                },
            ],
        });
    }

    if (conditions.length === 0) {
        return {};
    }

    return {
        AND: conditions,
    };
}

export async function searchItems(options: ItemSearchOptions) {
    return prisma.item.findMany({
        where: buildItemSearchWhere(options),
        orderBy: [{ name: "asc" }, { partNumber: "asc" }],
        include: {
            category: {
                include: {
                    parent: true,
                },
            },
            vendor: true,
            location: {
                include: {
                    parent: true,
                },
            },
            checkouts: {
                where: {
                    project: {
                        status: "ACTIVE",
                    },
                },
                select: {
                    quantityCheckedOut: true,
                },
            },
        },
    });
}

export async function getItemSearchFilterOptions() {
    return Promise.all([
        prisma.vendor.findMany({
            where: { active: true },
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
            },
        }),

        prisma.storageLocation.findMany({
            where: { active: true },
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        }),
    ]);
}
