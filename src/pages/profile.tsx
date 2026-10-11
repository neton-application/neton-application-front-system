"use client";

import * as React from "react";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { Alert, Button, Field, Input, PageHeader, Select } from "@neton/application-front-kit";
import { useT } from "@neton/application-front-runtime/i18n";
import { useDescribeError } from "@neton/application-front-runtime/errors";

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
  const t = useT("system");
  const describeError = useDescribeError();
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
      .catch((e: Error) => setError(describeError(e)));
  }, [describeError]);

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
      setError(describeError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={t("account.eyebrow")} title={t("profile.title")} description={t("profile.description")} />
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="info">{t("profile.saved")}</Alert>}
      <form onSubmit={save} className="front-surface grid max-w-xl gap-4 rounded-xl p-5">
        <Field label={t("common.username")}>
          <Input value={profile?.username ?? ""} disabled />
        </Field>
        <Field label={t("profile.field.nickname")}>
          <Input value={draft.nickname} onChange={(e) => setDraft({ ...draft, nickname: e.target.value })} />
        </Field>
        <Field label={t("common.email")}>
          <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        </Field>
        <Field label={t("common.mobile")}>
          <Input value={draft.mobile} onChange={(e) => setDraft({ ...draft, mobile: e.target.value })} />
        </Field>
        <Field label={t("common.gender")}>
          <Select value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value })}>
            <option value="0">{t("common.gender.unset")}</option>
            <option value="1">{t("common.gender.male")}</option>
            <option value="2">{t("common.gender.female")}</option>
          </Select>
        </Field>
        <div>
          <Button type="submit" disabled={pending || !profile}>{pending ? t("common.saving") : t("common.save")}</Button>
        </div>
      </form>
    </div>
  );
}
