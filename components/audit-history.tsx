"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import FilterBar from "./ui/filter-bar";
import SearchInput from "./ui/search-input";
import SelectDropdown, { type SelectDropdownOption } from "./ui/select-dropdown";

export type AuditAction =
    | "INVENTORY_ADJUSTED"
    | "PART_CREATED"
    | "PART_DELETED"
    | "PROJECT_CREATED"
    | "PROJECT_ARCHIVED"
    | "CATEGORY_CREATED"
    | "CATEGORY_DELETED"
    | "SUBCATEGORY_CREATED"
    | "SUBCATEGORY_DELETED"
    | "VENDOR_CREATED"
    | "VENDOR_DEACTIVATED"
    | "VENDOR_REACTIVATED"
    | "LOCATION_CREATED"
    | "LOCATION_DEACTIVATED"
    | "LOCATION_REACTIVATED"
    | "USER_CREATED"
    | "USER_DEACTIVATED"
    | "USER_REACTIVATED"
    | "USER_PROMOTED"
    | "USER_DEMOTED";

type AuditUser = {
    firstName: string;
    lastName: string;
    role: "STANDARD" | "MANAGER" | "ADMINISTRATOR";
};

type QuantityAdjustmentEntry = {
    id: string;
    action: "INVENTORY_ADJUSTED";
    item: {
        id: number;
        name: string;
        partNumber: string;
        category: {
            id: number;
            name: string;
            parent: { name: string } | null;
        };
    };
    quantityDelta: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string | null;
    user: AuditUser;
    createdAt: string;
};

type GeneralAuditEntry = {
    id: string;
    action: Exclude<AuditAction, "INVENTORY_ADJUSTED">;
    entityName: string;
    summary: string;
    user: AuditUser;
    createdAt: string;
};

export type AuditHistoryEntry = QuantityAdjustmentEntry | GeneralAuditEntry;

type AuditGroup = "ALL" | "INVENTORY" | "PROJECTS" | "CATEGORIES" | "VENDORS" | "LOCATIONS" | "ACCOUNTS";
type AuditHistoryProps = {
    entries: AuditHistoryEntry[];
};

const actionLabels: Record<AuditAction, string> = {
    INVENTORY_ADJUSTED: "Quantity Adjusted",
    PART_CREATED: "Part Added",
    PART_DELETED: "Part Removed",
    PROJECT_CREATED: "Project Created",
    PROJECT_ARCHIVED: "Project Archived",
    CATEGORY_CREATED: "Category Created",
    CATEGORY_DELETED: "Category Removed",
    SUBCATEGORY_CREATED: "Subcategory Created",
    SUBCATEGORY_DELETED: "Subcategory Removed",
    VENDOR_CREATED: "Vendor Created",
    VENDOR_DEACTIVATED: "Vendor Deactivated",
    VENDOR_REACTIVATED: "Vendor Reactivated",
    LOCATION_CREATED: "Location Created",
    LOCATION_DEACTIVATED: "Location Deactivated",
    LOCATION_REACTIVATED: "Location Reactivated",
    USER_CREATED: "User Created",
    USER_DEACTIVATED: "User Deactivated",
    USER_REACTIVATED: "User Reactivated",
    USER_PROMOTED: "User Promoted",
    USER_DEMOTED: "User Demoted",
};

const actionGroups: Record<AuditAction, Exclude<AuditGroup, "ALL">> = {
    INVENTORY_ADJUSTED: "INVENTORY",
    PART_CREATED: "INVENTORY",
    PART_DELETED: "INVENTORY",
    PROJECT_CREATED: "PROJECTS",
    PROJECT_ARCHIVED: "PROJECTS",
    CATEGORY_CREATED: "CATEGORIES",
    CATEGORY_DELETED: "CATEGORIES",
    SUBCATEGORY_CREATED: "CATEGORIES",
    SUBCATEGORY_DELETED: "CATEGORIES",
    VENDOR_CREATED: "VENDORS",
    VENDOR_DEACTIVATED: "VENDORS",
    VENDOR_REACTIVATED: "VENDORS",
    LOCATION_CREATED: "LOCATIONS",
    LOCATION_DEACTIVATED: "LOCATIONS",
    LOCATION_REACTIVATED: "LOCATIONS",
    USER_CREATED: "ACCOUNTS",
    USER_DEACTIVATED: "ACCOUNTS",
    USER_REACTIVATED: "ACCOUNTS",
    USER_PROMOTED: "ACCOUNTS",
    USER_DEMOTED: "ACCOUNTS",
};

const groupOptions: readonly SelectDropdownOption<AuditGroup>[] = [
    { value: "ALL", label: "All Areas" },
    { value: "INVENTORY", label: "Inventory" },
    { value: "PROJECTS", label: "Projects" },
    { value: "CATEGORIES", label: "Categories" },
    { value: "VENDORS", label: "Vendors" },
    { value: "LOCATIONS", label: "Locations" },
    { value: "ACCOUNTS", label: "Accounts" },
];

function formatRole(role: AuditUser["role"]) {
    switch (role) {
        case "ADMINISTRATOR":
            return "Administrator";
        case "MANAGER":
            return "Manager";
        default:
            return "Standard";
    }
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(date));
}

function getSearchableText(entry: AuditHistoryEntry) {
    const userName = `${entry.user.firstName} ${entry.user.lastName}`;

    if (entry.action === "INVENTORY_ADJUSTED") {
        const category = entry.item.category.parent ? `${entry.item.category.parent.name} ${entry.item.category.name}` : entry.item.category.name;
        return [entry.item.name, entry.item.partNumber, entry.reason ?? "", userName, category, actionLabels[entry.action]];
    }

    return [entry.entityName, entry.summary, userName, actionLabels[entry.action]];
}

export default function AuditHistory({ entries }: AuditHistoryProps) {
    const [search, setSearch] = useState("");
    const [group, setGroup] = useState<AuditGroup>("ALL");
    const [action, setAction] = useState<AuditAction | "ALL">("ALL");
    const actionOptions: SelectDropdownOption<AuditAction | "ALL">[] = [
        { value: "ALL", label: "All Activity" },
        ...Object.entries(actionLabels)
            .filter(([value]) => group === "ALL" || actionGroups[value as AuditAction] === group)
            .map(([value, label]) => ({
                value: value as AuditAction,
                label,
            })),
    ];

    const filteredEntries = useMemo(() => {
        const query = search.trim().toLowerCase();

        return entries.filter((entry) => {
            if (group !== "ALL" && actionGroups[entry.action] !== group) return false;
            if (action !== "ALL" && entry.action !== action) return false;
            if (!query) return true;

            return getSearchableText(entry).some((value) => value.toLowerCase().includes(query));
        });
    }, [entries, search, group, action]);

    return (
        <>
            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search activity, parts, projects, categories, users, or reasons..." ariaLabel="Search audit log" className="flex-1" />
                <SelectDropdown
                    value={group}
                    options={groupOptions}
                    onChange={(nextGroup) => {
                        setGroup(nextGroup);

                        if (action !== "ALL" && nextGroup !== "ALL" && actionGroups[action] !== nextGroup) {
                            setAction("ALL");
                        }
                    }}
                    ariaLabel="Filter audit area"
                    className="sm:w-40"
                />

                <SelectDropdown value={action} options={actionOptions} onChange={setAction} ariaLabel="Filter audit activity" className="sm:w-48" />
            </FilterBar>

            <p className="mb-3 text-xs text-fg-dim">
                Showing {filteredEntries.length} of {entries.length} audit entries
            </p>

            {filteredEntries.length === 0 ? (
                <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
                    <p className="text-sm text-fg-muted">No audit entries match your filters.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                    <table className="w-full min-w-225 border-collapse text-left text-sm">
                        <thead className="border-b border-border text-xs uppercase tracking-wide text-fg-muted">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Time</th>
                                <th className="px-4 py-3 font-semibold">Activity</th>
                                <th className="px-4 py-3 font-semibold">Details</th>
                                <th className="px-4 py-3 font-semibold">Changed By</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredEntries.map((entry) => (
                                <AuditRow key={entry.id} entry={entry} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}

function AuditRow({ entry }: { entry: AuditHistoryEntry }) {
    return (
        <tr className="border-b border-border">
            <td className="whitespace-nowrap px-4 py-4 text-fg-muted">{formatDate(entry.createdAt)}</td>
            <td className="px-4 py-4">
                <span className="whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-xs text-fg-muted">{actionLabels[entry.action]}</span>
            </td>

            <td className="px-4 py-4">{entry.action === "INVENTORY_ADJUSTED" ? <QuantityDetails entry={entry} /> : <GeneralDetails entry={entry} />}</td>

            <td className="whitespace-nowrap px-4 py-4">
                <p className="text-fg">
                    {entry.user.firstName} {entry.user.lastName}
                </p>
                <p className="mt-1 text-xs text-fg-dim">{formatRole(entry.user.role)}</p>
            </td>
        </tr>
    );
}

function QuantityDetails({ entry }: { entry: QuantityAdjustmentEntry }) {
    const category = entry.item.category.parent ? `${entry.item.category.parent.name} / ${entry.item.category.name}` : entry.item.category.name;

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3">
                <Link href={`/inventory/${entry.item.category.id}`} className="font-medium text-fg transition-colors hover:text-fg-muted">
                    {entry.item.name}
                </Link>
                <span className={entry.quantityDelta > 0 ? "font-semibold text-green-500" : "font-semibold text-accent"}>
                    {entry.quantityDelta > 0 ? "+" : ""}
                    {entry.quantityDelta}
                </span>
                <span className="text-fg-muted">
                    {entry.previousQuantity}
                    <span className="mx-2 text-fg-dim">→</span>
                    <span className="font-medium text-fg">{entry.newQuantity}</span>
                </span>
            </div>

            <p className="mt-1 text-xs text-fg-dim">
                {entry.item.partNumber}
                {" · "}
                {category}
            </p>
            <p className="mt-2 text-sm text-fg-muted">{entry.reason ?? "No reason provided"}</p>
        </div>
    );
}

function GeneralDetails({ entry }: { entry: GeneralAuditEntry }) {
    return (
        <div>
            <p className="font-medium text-fg">{entry.entityName}</p>
            <p className="mt-1 text-sm text-fg-muted">{entry.summary}</p>
        </div>
    );
}
