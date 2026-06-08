import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { hash } from 'bcryptjs';

import prisma from './prisma';

const rl = createInterface({ input, output });

async function main() {
    console.log('=== Create new user ===');

    const firstName = await rl.question('First name: ');
    const lastName = await rl.question('Last name: ');
    const password = await rl.question('Password: ');
    const typeIn = await rl.question('Type (1=Standard, 2=Manager, 3=Administrator): ');

    const type = typeIn.trim() === '3' ? 'ADMINISTRATOR' : (typeIn.trim() === '2' ? 'MANAGER' : 'STANDARD');
    const pwdHash = await hash(password, 12);

    const user = await prisma.user.create({
        data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            pwdHash,
            type
        }
    });

    console.log(`User created with ID: ${user.id}`);
    rl.close();

    await prisma.$disconnect();
}

main();