"use client";

import * as React from "react";
import { apiWrite } from "@neton/application-front-runtime/client";
import { Alert, Button, Field, Input, PageHeader } from "@neton/application-front-kit";
import { useT } from "@neton/application-front-runtime/i18n";
import { useDescribeError } from "@neton/application-front-runtime/errors";

/** 修改自己的密码。必须输入当前密码 —— 后端同样校验，只凭登录态改不了。 */
export default function PasswordPage() {
  const t = useT("system");
  const describeError = useDescribeError("system");
  const [pw, setPw] = React.useState({ old: "", next: "", confirm: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(false);
    if (pw.next.length < 8) return setError(t("password.error.tooShort"));
    if (pw.next !== pw.confirm) return setError(t("password.error.mismatch"));
    setPending(true);
    try {
      await apiWrite("/admin/system/user/profile/update-password", "PUT", { oldPassword: pw.old, newPassword: pw.next });
      setPw({ old: "", next: "", confirm: "" });
      setDone(true);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("account.eyebrow")} title={t("password.title")} description={t("password.description")} />
      {error && <Alert tone="error">{error}</Alert>}
      {done && <Alert tone="info">{t("password.done")}</Alert>}
      <form onSubmit={submit} className="front-surface grid max-w-xl gap-4 rounded-xl p-5">
        <Field label={t("password.field.current")}>
          <Input type="password" autoComplete="current-password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} />
        </Field>
        <Field label={t("password.field.next")}>
          <Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        </Field>
        <Field label={t("password.field.confirm")}>
          <Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        </Field>
        <div>
          <Button type="submit" disabled={pending || !pw.old || !pw.next || !pw.confirm}>{pending ? t("password.action.submitting") : t("password.action.submit")}</Button>
        </div>
      </form>
    </div>
  );
}
