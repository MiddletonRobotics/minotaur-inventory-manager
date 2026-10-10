export type ItemFieldType = "TEXT" | "INTEGER" | "DECIMAL" | "SELECT";
export type ItemFieldDefinitionData = {
    id: number;
    key: string;
    label: string;
    type: ItemFieldType;
    required: boolean;
    unit: string | null;
    options: string[];
    sortOrder: number;
    valueCount?: number;
};

export type ItemFieldValueData = { fieldDefinitionId: number; value: string };
export function itemFieldInputName(fieldId: number): string {
    return `itemField_${fieldId}`;
}

export function formatItemFieldValue(value: string, unit: string | null): string {
    const trimmed = value.trim();

    if (!trimmed) return "";

    return unit ? `${trimmed}${unit}` : trimmed;
}

export function buildItemNamePreview(template: string, fields: ItemFieldDefinitionData[], values: Record<number, string>): { name: string; complete: boolean } {
    let complete = true;

    const fieldsByKey = new Map(fields.map((field) => [field.key, field]));

    const name = template.replace(/\{([a-z][a-z0-9_]*)\}/g, (_match, key: string) => {
        const field = fieldsByKey.get(key);

        if (!field) {
            complete = false;
            return "";
        }

        const value = values[field.id]?.trim() ?? "";

        if (!value) {
            complete = false;
            return "";
        }

        return formatItemFieldValue(value, field.unit);
    });

    return { name: name.replace(/\s+/g, " ").trim(), complete };
}
