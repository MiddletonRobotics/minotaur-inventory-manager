import { redirect } from "next/navigation";

import { CreateUserForm, DeactivateUserButton, ReactivateUserControl, UserActionsMenu } from "@/components/user-management";
import { authenticate } from "@/server/session";
import prisma from "@/prisma/prisma";

function formatRole(role: string): string {
    switch (role) {
        case "ADMINISTRATOR":
            return "Administrator";
        case "MANAGER":
            return "Manager";
        default:
            return "Standard";
    }
}

export default async function AccountsSettings() {
    const session = await authenticate();

    if (!session) {
        redirect("/login");
    }

    if (session.user.role !== "ADMINISTRATOR") {
        redirect("/settings/inventory");
    }

    const [activeUsers, deactivatedUsers] = await Promise.all([
        prisma.user.findMany({
            where: { active: true },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                type: true,
                createdAt: true,
            },
            orderBy: [{ type: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
        }),

        prisma.user.findMany({
            where: { active: false },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                type: true,
                createdAt: true,
            },
            orderBy: [{ type: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
        }),
    ]);

    return (
        <section className="min-w-0 flex-1">
            <div className="border-b border-border pb-6">
                <h2 className="text-2xl font-semibold text-fg">User Accounts</h2>
                <p className="mt-1 text-sm text-fg-muted">Create and manage accounts with access to MinoManager.</p>
            </div>

            <section className="border-b border-border py-8">
                <h3 className="text-lg font-semibold text-fg">Create User</h3>
                <p className="mt-1 text-sm text-fg-muted">Add a Standard or Manager account.</p>

                <div className="max-w-xl">
                    <CreateUserForm />
                </div>
            </section>
            <section className="border-b border-border py-8">
                <h3 className="text-lg font-semibold text-fg">Existing Users</h3>
                <p className="mt-1 text-sm text-fg-muted">
                    {" "}
                    {activeUsers.length} active {activeUsers.length === 1 ? "account" : "accounts"}{" "}
                </p>

                <div className="mt-6">
                    {activeUsers.map((user) => {
                        const fullName = `${user.firstName} ${user.lastName}`;

                        return (
                            <div key={user.id} className="flex items-center justify-between gap-6 py-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                        <p className="truncate font-medium text-fg">{fullName}</p>
                                        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted">{formatRole(user.type)}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-fg-dim">Created {user.createdAt.toLocaleDateString()}</p>
                                </div>

                                {user.type === "ADMINISTRATOR" ? <span className="text-xs text-fg-dim">Protected</span> : <UserActionsMenu userId={user.id} userName={fullName} userRole={user.type} />}
                            </div>
                        );
                    })}
                </div>
            </section>
            <section className="py-8">
                <h3 className="text-lg font-semibold text-fg">Deactivated Users</h3>
                <p className="mt-1 text-sm text-fg-muted">
                    {" "}
                    {deactivatedUsers.length} deactivated {deactivatedUsers.length === 1 ? "account" : "accounts"}{" "}
                </p>
                <div className="mt-6">
                    {deactivatedUsers.map((user) => {
                        const fullName = `${user.firstName} ${user.lastName}`;

                        return (
                            <div key={user.id} className="flex items-center justify-between gap-6 py-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                        <p className="truncate font-medium text-fg-muted">{fullName}</p>
                                        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-dim">{formatRole(user.type)}</span>
                                        <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs text-accent">Deactivated</span>
                                    </div>

                                    <p className="mt-1 text-xs text-fg-dim">Created {user.createdAt.toLocaleDateString()}</p>
                                </div>

                                <ReactivateUserControl userId={user.id} userName={fullName} userRole={user.type} />
                            </div>
                        );
                    })}
                </div>
            </section>
        </section>
    );
}
