'use server';

import { z } from 'zod';
import { compare } from 'bcryptjs';
import { redirect } from 'next/navigation';

import prisma from '../prisma/prisma';
import { createSession, deleteSession } from '../lib/session';
import { switchToSession, getStoredSessions } from '../lib/session';

const LoginSchema = z.object({
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    password: z.string().min(8).max(100)
});

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData) : Promise<LoginState> {
    const parsed = LoginSchema.safeParse({
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        password: formData.get('password')
    });

    if(!parsed.success) {
        return { error: 'Please fill in all fields.' };
    }

    const { firstName, lastName, password } = parsed.data;

    const user = await prisma.user.findUnique({
        where: { 
            firstName_lastName: { firstName, lastName }
        },
    });

    if(!user) {
        return { error: 'Invalid name or password.' };
    }

    const passwordMatch = await compare(password, user.pwdHash);

    if(!passwordMatch) {
        return { error: 'Invalid name or password.' };
    }

    await createSession({
        id: String(user.id),
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.type === 'ADMINISTRATOR'
     });

     redirect('/');
}

export async function logout() : Promise<never> {
    await deleteSession();
    redirect('/login');
}

export async function switchUser(token: string) : Promise<void> {
    const success = await switchToSession(token);

    if (!success) {
        redirect('/login')
    }

    redirect('/')
}

export async function fetchStoredSessions() {
    return getStoredSessions();
}