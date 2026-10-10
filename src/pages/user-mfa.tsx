"use client";

import * as React from "react";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { usePermission } from "@neton/application-front-runtime/client-context";
import { Button, Drawer, ConfirmDialog, Alert } from "@neton/application-front-kit";

export default function UserMfa({ id, name, onClose }: { id: number; name: string; onClose: () => void }) {
  const canUpdate = usePermission("system:user:update");
  const canReset = usePermission("system:user:update-password");
  const [value, setValue] = React.useState<{ required: boolean; bound: boolean } | null>(null);
  const [error, setError] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  React.useEffect(() => {
    let current = true;
    apiFetch<{ required: boolean; bound: boolean }>(`/admin/system/user/mfa/${id}`)
      .then(data => { if (current) setValue(data); }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [id]);
  async function update(reset = false) {
    if (!value) return;
    setPending(true); setError("");
    try {
      await apiWrite(`/admin/system/user/mfa/${id}${reset ? "/reset" : ""}`, reset ? "POST" : "PUT", reset ? undefined : { required: value.required });
      if (reset) { setValue({ ...value, bound: false }); setConfirm(false); }
      else onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "操作失败"); }
    finally { setPending(false); }
  }
  return <>
    <Drawer open onClose={onClose} title={`${name} · MFA`} description="强制绑定后，用户须在下次登录时完成身份验证器绑定。" footer={<><Button variant="ghost" onClick={onClose}>关闭</Button>{canUpdate && <Button disabled={!value || pending} onClick={() => update()}>保存</Button>}</>}>
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {value ? <>
          <p>绑定状态：{value.bound ? "已绑定" : "未绑定"}</p>
          <label className="flex items-center gap-2"><input type="checkbox" checked={value.required} disabled={!canUpdate || pending} onChange={e => setValue({ ...value, required: e.target.checked })} />必须绑定 MFA</label>
          <p className="text-sm text-[var(--muted-foreground)]">修改强制策略会使旧会话失效。取消强制不会解除已有绑定。</p>
          {canReset && value.bound && <Button variant="outline" disabled={pending} onClick={() => setConfirm(true)}>重置 MFA</Button>}
        </> : <p>读取中…</p>}
      </div>
    </Drawer>
    <ConfirmDialog open={confirm} pending={pending} title="重置 MFA？" description="旧绑定、登录挑战及会话将失效。强制绑定要求保持不变，用户下次登录重新扫码绑定。" onCancel={() => setConfirm(false)} onConfirm={() => update(true)} />
  </>;
}
