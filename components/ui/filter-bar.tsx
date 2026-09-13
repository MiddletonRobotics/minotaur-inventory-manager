import type { ReactNode } from "react";

type FilterBarProps = {
    children: ReactNode;
    className?: string;
};

export default function FilterBar({ children, className = "" }: FilterBarProps) {
    return (
        <div className={`mb-5 flex flex-col gap-3 sm:flex-row ${className}`}>{children}</div>
    );
}