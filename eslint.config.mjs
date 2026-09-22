import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = [
    ...nextCoreWebVitals,
    ...nextTypescript,
    prettier,
    {
        ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "prisma/generated/**"],
    },
    {
        settings: {
            react: { version: "19" },
        },
    },
];

export default eslintConfig;
