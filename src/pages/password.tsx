"use client";

import * as React from "react";
import { apiWrite } from "@neton/application-front-runtime/client";
import { Alert, Button, Field, Input, PageHeader } from "@neton/application-front-kit";

/** 修改自己的密码。必须输入当前密码 —— 后端同样校验，只凭登录态改不了。 */
export default function PasswordPage() {
  const [pw, setPw] = React.useState({ old: "", next: "", confirm: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(false);
    if (pw.next.length < 8) return setError("新密码至少 8 位");
    if (pw.next !== pw.confirm) return setError("两次输入的新密码不一致");
    setPending(true);
    try {
      await apiWrite("/admin/system/user/profile/update-password", "PUT", { oldPassword: pw.old, newPassword: pw.next });
      setPw({ old: "", next: "", confirm: "" });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="个人中心" title="修改密码" description="需要先输入当前密码；新密码至少 8 位" />
      {error && <Alert tone="error">{error}</Alert>}
      {done && <Alert tone="info">密码已更新，下次登录请使用新密码</Alert>}
      <form onSubmit={submit} className="front-surface grid max-w-xl gap-4 rounded-xl p-5">
        <Field label="当前密码">
          <Input type="password" autoComplete="current-password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} />
        </Field>
        <Field label="新密码（至少 8 位）">
          <Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        </Field>
        <Field label="确认新密码">
          <Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        </Field>
        <div>
          <Button type="submit" disabled={pending || !pw.old || !pw.next || !pw.confirm}>{pending ? "提交中…" : "更新密码"}</Button>
        </div>
      </form>
    </div>
  );
}
