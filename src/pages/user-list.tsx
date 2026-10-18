"use client";

import * as React from "react";
import UserMfa from "./user-mfa";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { useMutation, usePermission, useQuery, useQueryClient } from "@neton/application-front-runtime/client-context";
import type { PageResponse } from "@neton/application-front-runtime/types";
import {
  Button, ConfirmDialog, DataTable, Drawer, Field, FilterPanel, Input, PageHeader,
  Pagination, RowActions, Select, StatusBadge, Textarea, type DataColumn,
} from "@neton/application-front-kit";
import { useT } from "@neton/application-front-runtime/i18n";
import { useDescribeError } from "@neton/application-front-runtime/errors";

interface User {
  id: number; username: string; nickname: string; email?: string | null; mobile?: string | null;
  avatar?: string | null; gender?: number; deptId?: number; remark?: string | null; status: number;
  createdAt?: string | null; updatedAt?: string | null;
}
interface Role { id: number; code: string; name: string; status: number }
interface Dept { id: number; name: string; parentId?: number; status: number }
interface UserForm {
  id?: number; username: string; password: string; nickname: string; deptId: string;
  email: string; mobile: string; gender: number; status: number; remark: string;
}
type Pending = { type: "delete" | "status"; user: User };
const emptyForm: UserForm = { username: "", password: "", nickname: "", deptId: "", email: "", mobile: "", gender: 0, status: 1, remark: "" };

export default function SystemUserListPage() {
  const t = useT("system");
  const describeError = useDescribeError("system");
  const queryClient = useQueryClient();
  const canCreate = usePermission("system:user:create");
  const canUpdate = usePermission("system:user:update");
  const canDelete = usePermission("system:user:delete");
  const canResetPassword = usePermission("system:user:update-password");
  const canAssignRole = usePermission("system:permission:assign");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [draft, setDraft] = React.useState({ username: "", mobile: "", status: "" });
  const [filters, setFilters] = React.useState(draft);
  const [form, setForm] = React.useState<UserForm | null>(null);
  const [rolesFor, setRolesFor] = React.useState<User | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = React.useState<number[]>([]);
  const [passwordFor, setPasswordFor] = React.useState<User | null>(null);
  const [password, setPassword] = React.useState("");
  const [mfaUser, setMfaUser] = React.useState<User | null>(null);
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const params = new URLSearchParams({ pageNo: String(page), pageSize: String(pageSize) });
  if (filters.username) params.set("username", filters.username);
  if (filters.mobile) params.set("mobile", filters.mobile);
  if (filters.status) params.set("status", filters.status);
  const users = useQuery({ queryKey: ["system-users", page, pageSize, filters], queryFn: () => apiFetch<PageResponse<User>>(`/admin/system/user/page?${params}`) });
  const roles = useQuery({ queryKey: ["system-simple-roles"], queryFn: () => apiFetch<Role[]>("/admin/system/role/simple-list") });
  const depts = useQuery({ queryKey: ["system-simple-depts"], queryFn: () => apiFetch<Dept[]>("/admin/system/dept/simple-list") });

  const save = useMutation({
    mutationFn: (value: UserForm) => apiWrite<void>(value.id ? "/admin/system/user/update" : "/admin/system/user/create", value.id ? "PUT" : "POST", {
      ...(value.id ? { id: value.id } : { password: value.password }), username: value.username.trim(), nickname: value.nickname.trim(),
      deptId: value.deptId ? Number(value.deptId) : null, email: value.email.trim() || null, mobile: value.mobile.trim() || null,
      gender: value.gender, status: value.status, remark: value.remark.trim() || null,
    }),
    onSuccess: async () => { setForm(null); await queryClient.invalidateQueries({ queryKey: ["system-users"] }); },
    onError: (cause: Error) => setError(describeError(cause)),
  });
  const destructiveAction = useMutation({
    mutationFn: ({ type, user }: Pending) => type === "delete"
      ? apiWrite<void>(`/admin/system/user/delete/${user.id}`, "DELETE")
      : apiWrite<void>(`/admin/system/user/update-status/${user.id}`, "PUT", { status: user.status === 1 ? 0 : 1 }),
    onSuccess: async () => { setPending(null); await queryClient.invalidateQueries({ queryKey: ["system-users"] }); },
  });
  const resetPassword = useMutation({
    mutationFn: () => apiWrite<void>("/admin/system/user/update-password", "PUT", { id: passwordFor!.id, newPassword: password }),
    onSuccess: () => { setPasswordFor(null); setPassword(""); },
    onError: (cause: Error) => setError(describeError(cause)),
  });
  const assignRoles = useMutation({
    mutationFn: () => apiWrite<void>("/admin/system/permission/assign-user-role", "POST", { userId: rolesFor!.id, roleIds: selectedRoleIds }),
    onSuccess: () => setRolesFor(null),
    onError: (cause: Error) => setError(describeError(cause)),
  });

  async function openEdit(user: User) {
    setError(null);
    try {
      const detail = await apiFetch<User>(`/admin/system/user/get/${user.id}`);
      setForm({ id: detail.id, username: detail.username, password: "", nickname: detail.nickname, deptId: detail.deptId ? String(detail.deptId) : "", email: detail.email ?? "", mobile: detail.mobile ?? "", gender: detail.gender ?? 0, status: detail.status, remark: detail.remark ?? "" });
    } catch (cause) { setError(describeError(cause)); }
  }
  async function openRoles(user: User) {
    setError(null); setRolesFor(user);
    try { setSelectedRoleIds(await apiFetch<number[]>(`/admin/system/permission/list-user-roles?userId=${user.id}`)); }
    catch (cause) { setError(describeError(cause)); }
  }
  function submitUser(event: React.FormEvent) {
    event.preventDefault(); if (!form) return;
    if (form.username.trim().length < 3 || form.nickname.trim().length < 2 || (!form.id && form.password.length < 8)) {
      setError(t("user.error.invalidForm")); return;
    }
    setError(null); save.mutate(form);
  }

  const columns: DataColumn<User>[] = [
    { key: "user", header: t("user.field.admin"), cell: (user) => <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary)]">{(user.nickname || user.username).slice(0, 1)}</span><div><strong>{user.nickname}</strong><div className="text-xs text-[var(--muted-foreground)]">ID {user.id}</div></div></div> },
    { key: "username", header: t("user.field.account"), cell: (user) => user.username },
    { key: "mobile", header: t("common.mobile"), cell: (user) => user.mobile || t("user.unbound") },
    { key: "email", header: t("common.email"), cell: (user) => user.email || t("user.unbound") },
    { key: "status", header: t("common.status"), cell: (user) => <StatusBadge active={user.status === 1}>{user.status === 1 ? t("common.enabled") : t("common.disabled")}</StatusBadge> },
    { key: "created", header: t("common.createdAt"), cell: (user) => user.createdAt || "-" },
    { key: "actions", header: t("common.actions"), headerClassName: "text-right", className: "text-right", cell: (user) => <RowActions
      primary={[
        ...(canUpdate ? [{ label: t("user.action.editProfile"), kind: "edit" as const, onClick: () => openEdit(user) }] : []),
        ...(canAssignRole ? [{ label: t("user.action.assignRoles"), kind: "assign" as const, onClick: () => openRoles(user) }] : []),
      ]}
      more={[
        { label: t("user.action.mfa"), kind: "settings" as const, onClick: () => setMfaUser(user) },
        ...(canResetPassword ? [{ label: t("user.action.resetPassword"), kind: "key" as const, onClick: () => { setError(null); setPassword(""); setPasswordFor(user); } }] : []),
        ...(canUpdate ? [{ label: user.status === 1 ? t("user.action.disable") : t("user.action.enable"), kind: user.status === 1 ? "disable" as const : "enable" as const, onClick: () => setPending({ type: "status", user }) }] : []),
        ...(canDelete && user.username !== "admin" ? [{ label: t("user.action.delete"), kind: "delete" as const, danger: true, onClick: () => setPending({ type: "delete", user }) }] : []),
      ]}
    /> },
  ];

  return <div className="space-y-4">
    {mfaUser && <UserMfa id={mfaUser.id} name={mfaUser.username} onClose={() => setMfaUser(null)} />}
    <PageHeader eyebrow={t("user.eyebrow")} title={t("user.title")} description={t("user.description")} actions={<>{canCreate && <Button onClick={() => { setError(null); setForm({ ...emptyForm }); }}>{t("user.action.create")}</Button>}<Button variant="outline" onClick={() => users.refetch()}>{t("common.refresh")}</Button></>} />
    <FilterPanel onSubmit={(event) => { event.preventDefault(); setPage(1); setFilters({ username: draft.username.trim(), mobile: draft.mobile.trim(), status: draft.status }); }}><div className="admin-filter-grid"><Field label={t("common.username")}><Input value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} placeholder={t("user.placeholder.username")} /></Field><Field label={t("common.mobile")}><Input value={draft.mobile} onChange={(event) => setDraft({ ...draft, mobile: event.target.value })} placeholder={t("user.placeholder.mobile")} /></Field><Field label={t("common.status")}><Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">{t("common.allStatus")}</option><option value="1">{t("common.enabled")}</option><option value="0">{t("common.disabled")}</option></Select></Field><div className="flex items-end gap-2"><Button type="button" variant="ghost" onClick={() => { const value = { username: "", mobile: "", status: "" }; setDraft(value); setFilters(value); setPage(1); }}>{t("common.reset")}</Button><Button type="submit">{t("common.search")}</Button></div></div></FilterPanel>
    {error && !form && !rolesFor && !passwordFor && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <section className="front-surface overflow-hidden rounded-xl"><DataTable columns={columns} rows={users.data?.list ?? []} rowKey={(user) => user.id} loading={users.isPending} error={users.error ? describeError(users.error) : null} minWidth={980} /><Pagination page={page} pageSize={pageSize} total={users.data?.total ?? 0} loading={users.isFetching} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} /></section>

    <Drawer open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? t("user.form.editTitle") : t("user.action.create")} description={t("user.form.description")} footer={<><Button variant="ghost" onClick={() => setForm(null)}>{t("common.cancel")}</Button><Button type="submit" form="system-user-form" disabled={save.isPending}>{save.isPending ? t("common.saving") : t("common.save")}</Button></>}>
      {form && <form id="system-user-form" onSubmit={submitUser} className="space-y-4">{error && <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</div>}<Field label={t("user.field.loginAccount")}><Input value={form.username} disabled={Boolean(form.id)} onChange={(event) => setForm({ ...form, username: event.target.value })} /></Field>{!form.id && <Field label={t("user.field.initialPassword")}><Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={t("user.placeholder.initialPassword")} /></Field>}<Field label={t("user.field.nickname")}><Input value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></Field><Field label={t("user.field.dept")}><Select value={form.deptId} onChange={(event) => setForm({ ...form, deptId: event.target.value })}><option value="">{t("user.field.noDept")}</option>{(depts.data ?? []).map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</Select></Field><div className="grid grid-cols-2 gap-3"><Field label={t("common.mobile")}><Input value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} /></Field><Field label={t("common.email")}><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field></div><div className="grid grid-cols-2 gap-3"><Field label={t("common.gender")}><Select value={form.gender} onChange={(event) => setForm({ ...form, gender: Number(event.target.value) })}><option value="0">{t("common.gender.unknown")}</option><option value="1">{t("common.gender.male")}</option><option value="2">{t("common.gender.female")}</option></Select></Field><Field label={t("common.status")}><Select value={form.status} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}><option value="1">{t("common.enabled")}</option><option value="0">{t("common.disabled")}</option></Select></Field></div><Field label={t("user.field.remark")}><Textarea value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} /></Field></form>}
    </Drawer>

    <Drawer open={Boolean(rolesFor)} onClose={() => setRolesFor(null)} title={t("user.action.assignRoles")} description={t("user.roles.subject", { nickname: rolesFor?.nickname ?? "", username: rolesFor?.username ?? "" })} footer={<><Button variant="ghost" onClick={() => setRolesFor(null)}>{t("common.cancel")}</Button><Button onClick={() => assignRoles.mutate()} disabled={selectedRoleIds.length === 0 || assignRoles.isPending}>{t("user.roles.save")}</Button></>}>
      <div className="space-y-2">{error && <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</div>}{roles.isPending ? <div className="text-sm text-[var(--muted-foreground)]">{t("user.roles.loading")}</div> : (roles.data ?? []).map((role) => <label key={role.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--muted)]"><input type="checkbox" checked={selectedRoleIds.includes(role.id)} onChange={(event) => setSelectedRoleIds(event.target.checked ? [...selectedRoleIds, role.id] : selectedRoleIds.filter((id) => id !== role.id))} /><span><strong className="block text-sm">{role.name}</strong><span className="text-xs text-[var(--muted-foreground)]">{role.code}</span></span></label>)}</div>
    </Drawer>

    <Drawer open={Boolean(passwordFor)} onClose={() => setPasswordFor(null)} title={t("user.action.resetPassword")} description={t("user.password.description", { username: passwordFor?.username ?? "" })} footer={<><Button variant="ghost" onClick={() => setPasswordFor(null)}>{t("common.cancel")}</Button><Button onClick={() => resetPassword.mutate()} disabled={password.length < 8 || resetPassword.isPending}>{t("user.password.confirm")}</Button></>}><div className="space-y-4">{error && <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</div>}<Field label={t("user.password.field")}><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("user.password.placeholder")} /></Field><p className="text-xs leading-5 text-[var(--muted-foreground)]">{t("user.password.hint")}</p></div></Drawer>

    <ConfirmDialog open={Boolean(pending)} title={pending?.type === "delete" ? t("user.confirm.deleteTitle") : pending?.user.status === 1 ? t("user.confirm.disableTitle") : t("user.confirm.enableTitle")} description={pending?.type === "delete" ? t("user.confirm.deleteBody", { username: pending.user.username }) : pending?.user.status === 1 ? t("user.confirm.disableBody", { username: pending?.user.username ?? "" }) : t("user.confirm.enableBody", { username: pending?.user.username ?? "" })} confirmLabel={t("user.confirm.confirm")} pending={destructiveAction.isPending} onCancel={() => setPending(null)} onConfirm={() => pending && destructiveAction.mutate(pending)} />
  </div>;
}
