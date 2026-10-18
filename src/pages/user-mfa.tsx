"use client";

import * as React from "react";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { usePermission } from "@neton/application-front-runtime/client-context";
import { Button, Drawer, ConfirmDialog, Alert } from "@neton/application-front-kit";
import { useT } from "@neton/application-front-runtime/i18n";
import { useDescribeError } from "@neton/application-front-runtime/errors";

export default function UserMfa({ id, name, onClose }: { id: number; name: string; onClose: () => void }) {
  const t = useT("system");
  const describeError = useDescribeError("system");
  const canUpdate = usePermission("system:user:update");
  const canReset = usePermission("system:user:update-password");
  const [value, setValue] = React.useState<{ required: boolean; bound: boolean } | null>(null);
  const [error, setError] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  React.useEffect(() => {
    let current = true;
    apiFetch<{ required: boolean; bound: boolean }>(`/admin/system/user/mfa/${id}`)
      .then(data => { if (current) setValue(data); }).catch(e => { if (current) setError(describeError(e)); });
    return () => { current = false; };
  }, [id, describeError]);
  async function update(reset = false) {
    if (!value) return;
    setPending(true); setError("");
    try {
      await apiWrite(`/admin/system/user/mfa/${id}${reset ? "/reset" : ""}`, reset ? "POST" : "PUT", reset ? undefined : { required: value.required });
      if (reset) { setValue({ ...value, bound: false }); setConfirm(false); }
      else onClose();
    } catch (e) { setError(describeError(e)); }
    finally { setPending(false); }
  }
  return <>
    <Drawer open onClose={onClose} title={t("userMfa.title", { name })} description={t("userMfa.description")} footer={<><Button variant="ghost" onClick={onClose}>{t("common.close")}</Button>{canUpdate && <Button disabled={!value || pending} onClick={() => update()}>{t("common.save")}</Button>}</>}>
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {value ? <>
          <p>{t("userMfa.bindStatus", { status: value.bound ? t("userMfa.bound") : t("userMfa.unbound") })}</p>
          <label className="flex items-center gap-2"><input type="checkbox" checked={value.required} disabled={!canUpdate || pending} onChange={e => setValue({ ...value, required: e.target.checked })} />{t("userMfa.required")}</label>
          <p className="text-sm text-[var(--muted-foreground)]">{t("userMfa.policyHint")}</p>
          {canReset && value.bound && <Button variant="outline" disabled={pending} onClick={() => setConfirm(true)}>{t("userMfa.action.reset")}</Button>}
        </> : <p>{t("common.loading")}</p>}
      </div>
    </Drawer>
    <ConfirmDialog open={confirm} pending={pending} title={t("userMfa.confirm.resetTitle")} description={t("userMfa.confirm.resetBody")} onCancel={() => setConfirm(false)} onConfirm={() => update(true)} />
  </>;
}
