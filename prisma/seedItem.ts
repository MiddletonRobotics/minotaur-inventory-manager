import 'dotenv/config';
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from 'node:process';
import prisma from './prisma';
import { Vendor } from './generated/enums';

const rl = createInterface({ input, output });
const vendors = Object.values(Vendor)

async function main() {
    console.log("=== Create new item ===");

    const categories = await prisma.category.findMany({
        orderBy: { id: 'asc' },
        include: { parent: { include: { parent: true} } }
    });

    if (categories.length === 0) {
        console.log('No categories found. Run seedCategory.ts to create a category first.');
        process.exit(1);
    }

    console.log('\n Avaliable Categories');
    for (const c of categories) {
        const grandparent = c.parent?.parent ? `${c.parent.parent.name} > ` : '';
        const parent = c.parent ? `${c.parent.name} > ` : '';
        console.log(`  [${c.id}] ${grandparent}${parent}${c.name}`);
    }

    const categoryInput = (await rl.question('\n Category ID: ')).trim();
    const categoryId = parseInt(categoryInput, 10);

    if(isNaN(categoryId)) {
        console.error('Invalid category ID.');
        process.exit(1);
    }

    const category = categories.find(c => c.id === categoryId);
    if (!category) {
        console.error(`No category found with ID: ${categoryId}`);
        process.exit(1);
    }

    console.log(`Category selected: ${category.name}`);

    const name = (await rl.question('Part name: ')).trim();
    const partNumber = (await rl.question('Part number (unique, given from vendor): ')).trim();
    const description = (await rl.question('Description: ')).trim();

    if (!name || !partNumber || !description) {
        console.error('Name, part number, and description are required');
        process.exit(1);
    }

    console.log('\n Vendors:');
    vendors.forEach((v, i) => console.log(`  [${i + 1}] ${v}`));

    const vendorInput = (await rl.question('Vendor number: ')).trim();
    const vendorIndex = parseInt(vendorInput, 10) - 1;

    if(isNaN(vendorIndex) || vendorIndex < 0 || vendorIndex >= vendors.length) {
        console.error('Invalid vendor selection');
        process.exit(1);
    }

    const vendor = vendors[vendorIndex];

    const material = (await rl.question('Material (optional): ')).trim();
    const location = (await rl.question('Storage location (e.g. "Cabinet A-B2"): ')).trim();
    const quantityStr = (await rl.question('Initial quantity on hand (default 0): ')).trim();
    const quantity = quantityStr === '' ? 0 : parseInt(quantityStr, 10);

    if (isNaN(quantity) || quantity < 0) {
        console.error('Quantity must be a non-negative integer');
        process.exit(1);
    }

    const item = await prisma.item.create({
        data: {
            name,
            partNumber,
            description,
            categoryId,
            vendor,
            material: material || null,
            location: location || null,
            quantity
        }
    });

    console.log(`\nItem created: [${item.id}] ${item.name} (${item.partNumber})`);
    console.log(`Category: ${category.name}`);
    console.log(`Vendor: ${item.vendor}`);
    console.log(`Location: ${item.location ?? 'not set'}`);
    console.log(`Quantity: ${item.quantity}`);

    rl.close();
    await prisma.$disconnect();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
})