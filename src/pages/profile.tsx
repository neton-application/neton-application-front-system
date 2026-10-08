"use client";

import * as React from "react";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { Alert, Button, Field, Input, PageHeader, Select } from "@neton/application-front-kit";

interface Profile {
  id: number;
  username: string;
  nickname: string;
  email?: string | null;
  mobile?: string | null;
  gender: number;
}

/**
 * 当前登录者的个人资料。只能改展示类字段：部门、角色、状态由管理员在「用户管理」里改，
 * 后端的 /profile/update 也只收这几个字段。
 */
export default function ProfilePage() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [draft, setDraft] = React.useState({ nickname: "", email: "", mobile: "", gender: "0" });
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    apiFetch<Profile>("/admin/system/user/profile/get")
      .then((p) => {
        setProfile(p);
        setDraft({ nickname: p.nickname ?? "", email: p.email ?? "", mobile: p.mobile ?? "", gender: String(p.gender ?? 0) });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      // 空串不发：后端按「null = 不改」处理，发空串会被邮箱/手机号格式校验拒掉
      await apiWrite("/admin/system/user/profile/update", "PUT", {
        nickname: draft.nickname.trim() || undefined,
        email: draft.email.trim() || undefined,
        mobile: draft.mobile.trim() || undefined,
        gender: Number(draft.gender),
      });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="个人中心" title="个人资料" description="修改你自己的昵称与联系方式；部门、角色由管理员维护" />
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="info">已保存</Alert>}
      <form onSubmit={save} className="front-surface grid max-w-xl gap-4 rounded-xl p-5">
        <Field label="用户名">
          <Input value={profile?.username ?? ""} disabled />
        </Field>
        <Field label="昵称（2–32 个字符）">
          <Input value={draft.nickname} onChange={(e) => setDraft({ ...draft, nickname: e.target.value })} />
        </Field>
        <Field label="邮箱">
          <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        </Field>
        <Field label="手机号">
          <Input value={draft.mobile} onChange={(e) => setDraft({ ...draft, mobile: e.target.value })} />
        </Field>
        <Field label="性别">
          <Select value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value })}>
            <option value="0">未设置</option>
            <option value="1">男</option>
            <option value="2">女</option>
          </Select>
        </Field>
        <div>
          <Button type="submit" disabled={pending || !profile}>{pending ? "保存中…" : "保存"}</Button>
        </div>
      </form>
    </div>
  );
}
