"use client";

type SearchInputProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    ariaLabel?: string;
    className?: string;
};

export default function SearchInput({ value, onChange, placeholder = "Search...", ariaLabel = "Search", className = "" }: SearchInputProps) {
    return (
        <input
            type="search" value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className={`min-w-0 rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg outline-none ${className}`}
        />
    );
}