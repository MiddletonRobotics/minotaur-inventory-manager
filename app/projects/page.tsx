import 'dotenv/config';
import Link from 'next/link';
import prisma from '@/prisma/prisma';
import Navbar from '@/components/navbar';

export default async function Projects() {
    const projects = await prisma.project.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <>
            <Navbar />
            <main className="min-h-[calc(100vh-60px)] w-full py-16 px-4 sm:px-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-center text-4xl font-black tracking-[0.2em] text-white uppercase mb-16">Projects</h1>

                    {projects.length === 0 ? (
                        <p className="text-xl font-bold text-zinc-300 tracking-wide">There are currently no active projects!</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                            {projects.map((project) => (
                                <div key={project.id} className="group relative bg-[#181818] border-x-1 border-b-1 border-t-6 border-[#ab0000]/80 rounded-2xl p-8 aspect-[3/4] flex flex-col items-center justify-between text-center">
                                    <div className="flex flex-col items-center flex-grow justify-center my-4 max-w-[90%]">
                                        <h2 className="text-xl font-black tracking-wider uppercase leading-snug">{project.name}</h2>

                                        {project.description && (
                                            <p className="text-sm text-zinc-400 mt-3 font-medium line-clamp-3 leading-relaxed">{project.description}</p>
                                        )}
                                    </div>

                                    <nav className="flex items-center gap-10 pl-3">
                                        <Link href={`/projects/${project.id}`} className="w-full py-3 px-6 bg-[#ab0000] text-xs font-black tracking-widest uppercase rounded-full shadow-md">
                                            <p>View Used Parts</p>
                                            {/* <span className="absolute bottom-0 left-0 h-[2px] w-full scale-x-0 bg-fg transition-transform duration-250 ease-out group-hover:scale-x-100" /> */}
                                        </Link>
                                    </nav>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}