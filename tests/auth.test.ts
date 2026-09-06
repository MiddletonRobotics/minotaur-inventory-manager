import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    findUnique: vi.fn(),
    compare: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    redirect: vi.fn(),
}));

vi.mock("@/prisma/prisma", () => ({
    default: {
        user: { findUnique: mocks.findUnique },
    },
}));

vi.mock("bcryptjs", () => ({
    compare: mocks.compare,
}));

vi.mock("@/lib/session", () => ({
    createSession: mocks.createSession,
    deleteSession: mocks.deleteSession,
}));

vi.mock("next/navigation", () => ({
    redirect: mocks.redirect,
}));

import { login, logout } from "@/server/auth";

function dummyFormData(firstName: string, lastName: string, password: string): FormData {
    const formData = new FormData();

    formData.set("firstName", firstName);
    formData.set("lastName", lastName);
    formData.set("password", password);

    return formData;
}

describe("login", () => {
    beforeEach(() => {
        mocks.redirect.mockImplementation((path: string) => {
            throw new Error(`REDIRECT:${path}`);
        });
    });

    it("rejects invalid form data", async () => {
        const formData = dummyFormData("", "Smith", "password123");

        const result = await login(undefined, formData);

        expect(result).toEqual({
            error: "Please fill in all fields.",
        });

        expect(mocks.findUnique).not.toHaveBeenCalled();
        expect(mocks.createSession).not.toHaveBeenCalled();
    });

    it("rejects a user that does not exist", async () => {
        mocks.findUnique.mockResolvedValue(null);

        const formData = dummyFormData("John", "Smith", "password123");

        const result = await login(undefined, formData);

        expect(result).toEqual({
            error: "Invalid name or password.",
        });

        expect(mocks.compare).not.toHaveBeenCalled();
        expect(mocks.createSession).not.toHaveBeenCalled();
    });

    it("rejects an incorrect password", async () => {
        mocks.findUnique.mockResolvedValue({
            id: 12345678,
            firstName: "John",
            lastName: "Smith",
            type: "STANDARD",
            pwdHash: "hashed-password",
            active: true,
        });

        mocks.compare.mockResolvedValue(false);

        const formData = dummyFormData("John", "Smith", "wrong-password");

        const result = await login(undefined, formData);

        expect(result).toEqual({
            error: "Invalid name or password.",
        });

        expect(mocks.compare).toHaveBeenCalledWith("wrong-password", "hashed-password");

        expect(mocks.createSession).not.toHaveBeenCalled();
    });

    it("rejects a deactivated user", async () => {
        mocks.findUnique.mockResolvedValue({
            id: 12345678,
            firstName: "John",
            lastName: "Smith",
            type: "STANDARD",
            pwdHash: "hashed-password",
            active: false,
        });

        const formData = dummyFormData("John", "Smith", "password123");

        const result = await login(undefined, formData);

        expect(result).toEqual({
            error: "Invalid name or password.",
        });

        expect(mocks.createSession).not.toHaveBeenCalled();
    });

    it("creates a session when credentials are valid", async () => {
        mocks.findUnique.mockResolvedValue({
            id: 12345678,
            firstName: "John",
            lastName: "Smith",
            type: "STANDARD",
            pwdHash: "hashed-password",
            active: true,
        });

        mocks.compare.mockResolvedValue(true);

        const formData = dummyFormData("John", "Smith", "password123");

        await expect(login(undefined, formData)).rejects.toThrow("REDIRECT:/");

        expect(mocks.createSession).toHaveBeenCalledOnce();

        expect(mocks.redirect).toHaveBeenCalledWith("/");
    });
});
