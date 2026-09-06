import "dotenv/config";
import Link from "next/link";
import prisma from "@/prisma/prisma";
import Navbar from "@/components/navbar";

export default async function Projects() {
    const projects = await prisma.project.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
    });

    return (
        <>
            <Navbar />
            <main className="projects-page">
                <div className="projects-container">
                    <h1 className="projects-title">Projects</h1>

                    {projects.length === 0 ? (
                        <p className="projects-empty">There are currently no active projects!</p>
                    ) : (
                        <div className="projects-grid">
                            {projects.map((project) => (
                                <article key={project.id} className="project-card">
                                    <div className="project-card-content">
                                        <h2 className="project-card-title">{project.name}</h2>
                                        {project.description ? <p className="project-card-description">{project.description}</p> : null}
                                    </div>
                                    <Link href={`/projects/${project.id}`} className="project-card-action">
                                        View Used Parts
                                    </Link>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
