export interface EditableSetting {
  key: string;
  valueType: number;
}

// Keep wire values as strings: Long and decimal settings must not pass through Number.
export function settingDraft(setting: EditableSetting, value: string): string {
  if (setting.valueType !== 3) return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return "true";
  if (["false", "0", "no", "off"].includes(normalized)) return "false";
  return value;
}

export function settingUpdate(setting: EditableSetting, draft: string): { key: string; value: string } {
  const value = settingDraft(setting, draft.trim());
  if (setting.valueType === 3 && value !== "true" && value !== "false") {
    throw new Error("Invalid boolean setting");
  }
  return { key: setting.key, value };
}
