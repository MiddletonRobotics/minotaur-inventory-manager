import { redirect } from "next/navigation";
import { ArchiveProjectButton, CreateProjectForm } from "@/components/project-management";
import { authenticate } from "@/server/session";
import prisma from "@/prisma/prisma";

export default async function ProjectSettings() {
    const session = await authenticate();

    if (!session) {
        redirect("/login");
    }

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") {
        redirect("/");
    }

    const [activeProjects, archivedProjects] = await Promise.all([
        prisma.project.findMany({
            where: { status: "ACTIVE" },
            include: {
                createdByUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                checkouts: {
                    select: {
                        quantityCheckedOut: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        }),

        prisma.project.findMany({
            where: { status: "ARCHIVED" },
            include: {
                createdByUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                checkouts: {
                    select: {
                        quantityCheckedOut: true,
                    },
                },
            },
            orderBy: [{ archivedAt: "desc" }, { createdAt: "desc" }],
        }),
    ]);

    return (
        <section className="min-w-0 flex-1">
            <div className="border-b border-border pb-6">
                <h2 className="text-2xl font-semibold text-fg">Projects</h2>
                <p className="mt-1 text-sm text-fg-muted">Create and archive robotics projects.</p>
            </div>

            <section className="border-b border-border py-8">
                <h3 className="text-lg font-semibold text-fg">Create Project</h3>
                <p className="mt-1 text-sm text-fg-muted">Add a new active project to MinoManager.</p>
                <div className="max-w-xl">
                    <CreateProjectForm />
                </div>
            </section>

            <section className="py-8">
                <h3 className="text-lg font-semibold text-fg">Active Projects</h3>
                <p className="mt-1 text-sm text-fg-muted">
                    {activeProjects.length} active {activeProjects.length === 1 ? "project" : "projects"}
                </p>

                {activeProjects.length === 0 ? (
                    <p className="mt-6 text-sm text-fg-dim">There are currently no active projects.</p>
                ) : (
                    <div className="mt-6 divide-y divide-border border-y border-border">
                        {activeProjects.map((project) => {
                            const checkedOutQuantity = project.checkouts.reduce((total, checkout) => total + checkout.quantityCheckedOut, 0);
                            const creator = `${project.createdByUser.firstName} ${project.createdByUser.lastName}`;

                            return (
                                <div key={project.id} className="flex items-center justify-between gap-8 py-5">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3">
                                            <p className="truncate font-medium text-fg">{project.name}</p>
                                            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted">Active</span>
                                        </div>

                                        {project.description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{project.description}</p>}

                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-dim">
                                            <span>
                                                {checkedOutQuantity} {checkedOutQuantity === 1 ? "part" : "parts"} checked out
                                            </span>
                                            <span>Created by {creator}</span>
                                            <span>{project.createdAt.toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <ArchiveProjectButton projectId={project.id} projectName={project.name} checkedOutQuantity={checkedOutQuantity} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
            <section className="py-8">
                <h3 className="text-lg font-semibold text-fg">Archived Projects</h3>
                <p className="mt-1 text-sm text-fg-muted">
                    {archivedProjects.length} archived {archivedProjects.length === 1 ? "project" : "projects"}
                </p>

                {archivedProjects.length === 0 ? (
                    <p className="mt-6 text-sm text-fg-dim">There are currently no archived projects.</p>
                ) : (
                    <div className="mt-6 divide-y border-y border-border">
                        {archivedProjects.map((project) => {
                            const historicalQuantity = project.checkouts.reduce((total, checkout) => total + checkout.quantityCheckedOut, 0);
                            const creator = `${project.createdByUser.firstName} ${project.createdByUser.lastName}`;

                            return (
                                <div key={project.id} className="flex items-center justify-between gap-8 py-5">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3">
                                            <p className="truncate font-medium text-fg-muted">{project.name}</p>
                                            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-dim">Archived</span>
                                        </div>

                                        {project.description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{project.description}</p>}

                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-dim">
                                            <span>
                                                {historicalQuantity} {historicalQuantity === 1 ? "part" : "parts"} in project history
                                            </span>
                                            <span> Created by {creator}</span>
                                            <span>Created {project.createdAt.toLocaleDateString()}</span>
                                            <span>{project.archivedAt ? `Archived ${project.archivedAt.toLocaleDateString()}` : "Archive date unavailable"}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </section>
    );
}
