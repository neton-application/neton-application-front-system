"use client";

import * as React from "react";
import { Input, Select } from "@neton/application-front-kit";
import type { Translate } from "@neton/application-front-runtime/i18n";

export function SettingValueInput({ valueType, value, disabled, onChange, t }: {
  valueType: number;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  t: Translate;
}) {
  if (valueType === 3) {
    return (
      <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {value !== "true" && value !== "false" && <option value={value} disabled>{value || t("setting.boolean.select")}</option>}
        <option value="true">{t("setting.boolean.true")}</option>
        <option value="false">{t("setting.boolean.false")}</option>
      </Select>
    );
  }
  return <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} autoComplete="off" />;
}
