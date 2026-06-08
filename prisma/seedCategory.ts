import 'dotenv/config';
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import prisma from "./prisma";

const rl = createInterface({ input, output });

async function main() {
    console.log('=== Create new category ===');

    const existing = await prisma.category.findMany({
        orderBy: { id: 'asc' },
        include: { parent: true }
    });

    if (existing.length > 0) {
        console.log('\n Existing Categories:')

        for (const e of existing) {
            const parentLabel = e.parent ? ` (under: ${e.parent.name})` : ' (root)';
            console.log(`  [${e.id}] ${e.name}${parentLabel}`);
        }
    } else {
        console.log('\n No existing categories were found, this will be the root category');
    }

    const name = (await rl.question('\n Category name: ')).trim();

    if (!name) {
        console.error('Name is required.');
        process.exit(1);
    }

    let parentId: number | null = null;

    if (existing.length > 0) {
        const parentInput = (await rl.question('Parent Category ID (leave blank if root category): ')).trim();

        if (parentInput !== '') {
            const parentIdParsed = parseInt(parentInput, 10);

            if(isNaN(parentIdParsed)) {
                console.error('Invalid parent ID');
                process.exit(1);
            }

            const parent = existing.find(e => e.id === parentIdParsed);

            if (!parent) {
                console.error(`No category found with ID ${parentIdParsed}.`);
                process.exit(1);
            }

            parentId = parentIdParsed;
            console.log(`Parent category set to ${parent.name}`);
        }
    }

    const category = await prisma.category.create({
        data: {
            name,
            parentId
        }
    });

    console.log(`\n Category created: [${category.id}] ${category.name} ${parentId ? `(parentId: ${parentId})` : '(root)'}`)

    rl.close();
    await prisma.$disconnect();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
})