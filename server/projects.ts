"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate } from "@/server/session";
import prisma from "@/prisma/prisma";

const CreateProjectSchema = z.object({
    name: z.string().trim().min(1, "Project name is required.").max(100, "Project name is too long."),
    description: z.string().trim().max(500, "Description is too long.").optional(),
});

export type ProjectActionState = { error?: string; success?: string } | undefined;

async function requireProjectManager() {
    const session = await authenticate();

    if (!session) {
        redirect("/login");
    }

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") {
        redirect("/");
    }

    return session;
}

export async function createProject(_previousState: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
    const session = await requireProjectManager();

    const parsed = CreateProjectSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid project information." };
    }

    const { name, description } = parsed.data;
    const existingProject = await prisma.project.findUnique({
        where: { name },
    });

    if (existingProject) {
        return { error: "A project with that name already exists." };
    }

    await prisma.project.create({
        data: {
            name,
            description: description && description.length > 0 ? description : null,
            status: "ACTIVE",
            createdById: Number(session.user.id),
        },
    });

    revalidatePath("/settings/projects");
    revalidatePath("/projects");

    return { success: `${name} was created successfully.` };
}

export async function archiveProject(projectId: number): Promise<void> {
    await requireProjectManager();

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, status: true },
    });

    if (!project) {
        return;
    }

    if (project.status === "ARCHIVED") {
        return;
    }

    await prisma.project.update({
        where: { id: project.id },
        data: {
            status: "ARCHIVED",
            archivedAt: new Date(),
        },
    });

    revalidatePath("/settings/projects");
    revalidatePath("/projects");
    revalidatePath("/inventory");
    revalidatePath("/inventory/[id]", "page");
}
