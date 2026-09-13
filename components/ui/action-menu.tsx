"use client";

import { EllipsisVertical } from "lucide-react";
import type { ReactNode } from "react";
import Dropdown, { dangerousDropdownItemCSS, dropdownItemCSS } from "@/components/ui/dropdown";

type ActionMenuProps = { children: ReactNode };

export default function ActionMenu({ children }: ActionMenuProps) {
    return (
        <Dropdown
            menuClassName="min-w-44"
            trigger={({ open, toggle, menuId }) => (
                <button
                    type="button"
                    onClick={toggle}
                    className="rounded-md p-2 text-fg-muted transition-colors hover:bg-input hover:text-fg"
                    aria-label="Actions"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-controls={open ? menuId : undefined}
                >
                    <EllipsisVertical size={18} />
                </button>
            )}
        >
            {({ close }) => (
                <div
                    role="menu"
                    onClick={(event) => {
                        const target = event.target as Element;

                        if (target.closest("form")) {
                            window.setTimeout(close, 0);
                            return;
                        }

                        close();
                    }}
                >
                    {children}
                </div>
            )}
        </Dropdown>
    );
}

export const actionMenuItemCSS = dropdownItemCSS;
export const dangerousActionMenuItemCSS = dangerousDropdownItemCSS;
