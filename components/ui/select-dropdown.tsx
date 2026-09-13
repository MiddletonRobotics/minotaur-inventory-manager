"use client";

import { Check, ChevronDown } from "lucide-react";
import Dropdown, { dropdownItemCSS } from "@/components/ui/dropdown";

type SelectValue = | string | number;

export type SelectDropdownOption<T extends SelectValue = string> = {
    value: T;
    label: string;
    disabled?: boolean;
};

type SelectDropdownProps<T extends SelectValue> = {
    value: T;
    options: readonly SelectDropdownOption<T>[];
    onChange: (value: T) => void;
    ariaLabel: string;
    className?: string;
    menuClassName?: string;
};

export default function SelectDropdown<T extends SelectValue>({ value, options, onChange, ariaLabel, className = "", menuClassName = "" }: SelectDropdownProps<T>) {
    const selected = options.find((option) => option.value === value);

    if (!selected) {
        throw new Error(`SelectDropdown received an unknown value: ${String(value)}`);
    }

    return (
        <Dropdown
            className={className}
            menuClassName={`min-w-full ${menuClassName}`}
            trigger={({ open, toggle, menuId }) => (
                <button
                    type="button"
                    onClick={toggle}
                    aria-label={ariaLabel}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-controls={open ? menuId : undefined}
                    className="flex w-full items-center justify-between gap-4 rounded-md border border-border bg-input px-3 py-2.5 text-sm text-fg transition-colors hover:border-border-focus"
                >
                    <span className="truncate">{selected.label}</span>
                    <ChevronDown size={15} className={`shrink-0 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
            )}
        >
            {({ close }) => (
                <div role="menu" aria-label={ariaLabel}>
                    {options.map((option) => {
                            const isSelected = option.value === value;

                            return (
                                <button
                                    key={String(option.value)}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={isSelected}
                                    disabled={option.disabled}
                                    onClick={() => {
                                        onChange(option.value);
                                        close();
                                    }}
                                    className={`${dropdownItemCSS} justify-between gap-4 ${isSelected ? "bg-input text-fg" : ""}`}
                                >
                                    <span>{option.label}</span>

                                    {isSelected && (
                                        <Check size={14} className="shrink-0" />
                                    )}
                                </button>
                            );
                        },
                    )}
                </div>
            )}
        </Dropdown>
    );
}