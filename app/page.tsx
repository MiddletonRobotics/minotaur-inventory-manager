import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Callout from "@/components/ui/callout";
import Navbar from "@/components/navbar";
import { authenticate } from "@/server/session";

type SectionProps = { title: string; children: ReactNode };

function Section({ title, children }: SectionProps) {
    return (
        <section className="border-t border-border py-7">
            <h2 className="mb-4 text-xl font-semibold text-fg">{title}</h2>
            <div className="space-y-4 text-sm leading-6 text-fg-muted">{children}</div>
        </section>
    );
}

function RuleList({ children }: { children: ReactNode }) {
    return <ul className="list-disc space-y-2 pl-5 marker:text-fg-dim">{children}</ul>;
}

export default async function Home() {
    const session = await authenticate();

    if (!session) redirect("/login");

    return (
        <>
            <Navbar />

            <main className="min-h-[calc(100vh-80px)] w-full px-4 py-10 font-dmsans sm:px-8">
                <div className="mx-auto max-w-6xl">
                    <header className="mx-auto max-w-6xl pb-10">
                        <h1 className="text-center text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Welcome to MinoManager</h1>
                        <div className="mt-6 space-y-3 text-base leading-7 text-fg-muted">
                            <p>MinoManager is the inventory system FRC 1369 uses to keep track of the parts we own, where they are stored, where they came from, and how much inventory of that part is avaliable.</p>
                            <p>
                                Keeping the system accurate is crucial, and it depends on everyone following the same standards when finding, adding, moving, and adjusting parts. If we do not keep an accurate count of what we
                                have in the lab, this will make the design and build process during season even more annoying and more stressful than it has to be. We work long hours, and the last thing that we need to deal
                                with during season is how we do not have the pullies needed some subsystem. Below are some best practices and guidelines to follow when it comes to appending the inventory system.
                            </p>
                        </div>
                    </header>

                    <Section title="How the Inventory System Works">
                        <p>Inventory is organized into categories and subcategories. Parts are always stored inside a subcategory.</p>
                        <div className="rounded-md border border-border bg-card p-5 font-mono text-sm leading-7 text-fg">
                            <p>Inventory</p>
                            <p className="pl-4">└── Category</p>
                            <p className="pl-8">└── Subcategory</p>
                            <p className="pl-12">└── Part</p>
                        </div>

                        <p>
                            Every part has three important quantity values. The total quantity is the actual amount of a part that the team physically owns. The used quantity is the amount of a part that is assigned to active
                            projects, and the avaliable quantity is the difference between the total and used quantity (ie. the amount currently avaliable for use).
                        </p>
                    </Section>

                    <Section title="Finding Parts">
                        <RuleList>
                            <li>Search using either the part name or part number from the manufacturer.</li>
                            <li>Searching from the main Inventory page searches everything. Searching inside a category or subcategory only searches below that location.</li>
                            <li>Use Vendor and Location filters when you need to narrow down larger sets of results.</li>
                        </RuleList>

                        <Callout variant="info" title="Always search for parts before adding a new part.">
                            <ul className="list-disc space-y-1.5 pl-5 marker:text-fg-dim">
                                <li>This prevents creating duplicate records in the system, which would cause confusion and could lead to issues.</li>
                            </ul>
                        </Callout>
                    </Section>

                    <Section title="Adding Parts">
                        <RuleList>
                            <li>Add the part to the most appropriate subcategory.</li>
                            <li>Fill out all of the information inside the form accurately.</li>
                            <li>Use the manufacturer&apos;s part number whenever one exists, if one does not exist, contact a Manager.</li>
                        </RuleList>

                        <Callout variant="error" title="Quantity should represent the physical amount the team owns.">
                            <ul className="list-disc space-y-1.5 pl-5 marker:text-fg-dim">
                                <li>Do not create duplicate records for identical parts.</li>
                                <li>Do not change quantity simply because a part was moved or assigned somewhere else.</li>
                            </ul>
                        </Callout>
                    </Section>

                    <Section title="Adjusting Inventory Quantity">
                        <p>
                            Quantity adjustments should only be used when the physical amount of inventory changes or when the recorded count is incorrect. For example, receiving 10 new bearings should be recorded as{" "}
                            <span className="font-medium text-fg">+10</span>, while finding two damaged bearings that must be discarded should be recorded as <span className="font-medium text-fg">-2</span>. When doing an
                            adjustment, always include a useful reason explaining why the quantity was changed for documentation purposes.
                        </p>
                    </Section>

                    <Section title="Storage Locations">
                        <RuleList>
                            <li>Parts should have an accurate storage location whenever possible.</li>
                            <li>Assign parts to the lowest-level location where they are actually stored.</li>
                        </RuleList>
                    </Section>
                </div>
            </main>
        </>
    );
}
