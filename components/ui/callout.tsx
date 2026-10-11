import type { ReactNode } from "react";

type CalloutVariant = "error" | "warning" | "info";
type CalloutProps = {
    variant: CalloutVariant;
    title?: ReactNode;
    children: ReactNode;
    className?: string;
};

const variantStyles: Record<CalloutVariant, { container: string; title: string }> = {
    error: {
        container: "border-red-900/70 border-l-red-600 bg-red-950/30",
        title: "text-fgs",
    },

    warning: {
        container: "border-amber-800/70 border-l-amber-500 bg-amber-950/25",
        title: "text-amber-100",
    },

    info: {
        container: "border-sky-900/70 border-l-sky-500 bg-sky-950/25",
        title: "text-sku-100",
    },
};

export default function Callout({ variant, title, children, className = "" }: CalloutProps) {
    const styles = variantStyles[variant];

    return (
        <aside className={`rounded-md border border-l-4 px-5 py-4 ${styles.container} ${className}`}>
            {title && <p className={`font-semibold ${styles.title}`}>{title}</p>}

            <div className={title ? "mt-3 text-sm leading-6 text-fg-muted" : "text-sm leading-6 text-fg-muted"}>{children}</div>
        </aside>
    );
}
