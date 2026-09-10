import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import prisma from "./prisma";

const rl = createInterface({ input, output });

async function main() {
    console.log("=== Create new item ===");

    const categories = await prisma.category.findMany({
        where: {
            parentId: { not: null },
        },
        orderBy: { name: "asc" },
        include: { parent: true },
    });

    if (categories.length === 0) {
        console.log("No subcategories found. Create a subcategory first.");
        process.exit(1);
    }

    console.log("\nAvailable Subcategories:");

    for (const category of categories) {
        console.log(`  [${category.id}] ${category.parent?.name} > ${category.name}`);
    }

    const categoryInput = (await rl.question("\nCategory ID: ")).trim();
    const categoryId = Number(categoryInput);

    if (!Number.isInteger(categoryId)) {
        console.error("Invalid category ID.");
        process.exit(1);
    }

    const category = categories.find((category) => category.id === categoryId);

    if (!category) {
        console.error(`No subcategory found with ID: ${categoryId}`);
        process.exit(1);
    }

    const name = (await rl.question("Part name: ")).trim();
    const partNumber = (await rl.question("Part number: ")).trim();
    const description = (await rl.question("Description: ")).trim();

    if (!name || !partNumber) {
        console.error("Part name and part number are required.");
        process.exit(1);
    }

    const vendors = await prisma.vendor.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
    });

    if (vendors.length === 0) {
        console.error("No active vendors exist. Add a vendor first.");
        process.exit(1);
    }

    console.log("\nVendors:");

    vendors.forEach((vendor, index) => {
        console.log(`  [${index + 1}] ${vendor.name}`);
    });

    const vendorInput = (await rl.question("Vendor number: ")).trim();
    const vendorIndex = Number(vendorInput) - 1;

    if (!Number.isInteger(vendorIndex) || vendorIndex < 0 || vendorIndex >= vendors.length) {
        console.error("Invalid vendor selection.");
        process.exit(1);
    }

    const vendor = vendors[vendorIndex];
    const locations = await prisma.storageLocation.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        include: { parent: true },
    });

    console.log("\nStorage Locations:");
    console.log("  [0] Not set");

    locations.forEach((location, index) => {
        const label = location.parent ? `${location.parent.name} > ${location.name}` : location.name;
        console.log(`  [${index + 1}] ${label}`);
    });

    const locationInput = (await rl.question("Location number: ")).trim();
    const locationIndex = Number(locationInput);

    let locationId: | number | null = null;

    if (!Number.isInteger(locationIndex) || locationIndex < 0 || locationIndex > locations.length) {
        console.error("Invalid location selection.");
        process.exit(1);
    }

    if (locationIndex > 0) {
        locationId = locations[locationIndex - 1].id;
    }

    const material = (await rl.question("Material (optional): ")).trim();
    const quantityInput = (await rl.question("Initial quantity (default 0): ")).trim();
    const quantity = quantityInput === "" ? 0 : Number(quantityInput);

    if (!Number.isInteger(quantity) || quantity < 0) {
        console.error("Quantity must be a non-negative integer.");
        process.exit(1);
    }

    const item = await prisma.item.create({
        data: {
            name,
            partNumber,
            description: description || "",
            categoryId,
            vendorId: vendor.id,
            locationId,
            material: material || null,
            quantity,
        },
        include: {
            vendor: true,
            location: {
                include: { parent: true },
            },
        },
    });

    console.log(`\nItem created: [${item.id}] ${item.name} (${item.partNumber})`);
    console.log(`Category: ${category.parent?.name} > ${category.name}`);
    console.log(`Vendor: ${item.vendor.name}`);

    if (item.location) {
        const locationName = item.location.parent ? `${item.location.parent.name} > ${item.location.name}` : item.location.name;
        console.log(`Location: ${locationName}`);
    } else {
        console.log("Location: not set");
    }

    console.log(`Quantity: ${item.quantity}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
}).finally(async () => {
    rl.close();
    await prisma.$disconnect();
});