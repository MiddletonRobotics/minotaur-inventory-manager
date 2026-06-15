import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import prisma from './prisma';

const rl = createInterface({ input, output });

async function main() {
    console.log('=== Create new project ===');

    const users = await prisma.user.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, firstName: true, lastName: true, type: true }
    });

    if (users.length === 0) {
        console.error('No users found. Run seedUser.ts to create a user first');
        process.exit(1);
    }

    console.log('\n Users:');
    for (const u of users) {
        console.log(`  [${u.id}] ${u.firstName} ${u.lastName} (${u.type})`);
    }

    const name = (await rl.question('\n Project name: ')).trim();
    const description = (await rl.question('Description (optional): ')).trim();

    if (!name) {
        console.error('Project name is required.');
        process.exit(1);
    }

    const userInput = (await rl.question('Created by user ID: ')).trim();
    const createdById = parseInt(userInput, 10)

    if (isNaN(createdById)) {
        console.error('Invalid user ID');
        process.exit(1);
    }

    const user = users.find(u => u.id === createdById);

    if (!user) {
        console.error(`No user found with ID ${createdById}.`);
        process.exit(1);
    }

    const project = await prisma.project.create({
        data: {
            name,
            description: description || null,
            createdById
        }
    });

    console.log(`\nProject created: [${project.id}] "${project.name}" by ${user.firstName} ${user.lastName}`);

    rl.close();
    await prisma.$disconnect();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});