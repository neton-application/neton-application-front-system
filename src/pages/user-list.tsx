"use client";

import * as React from "react";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { useMutation, usePermission, useQuery, useQueryClient } from "@neton/application-front-runtime/client-context";
import type { PageResponse } from "@neton/application-front-runtime/types";
import {
  Button, ConfirmDialog, DataTable, Drawer, Field, FilterPanel, Input, PageHeader,
  Pagination, RowActions, Select, StatusBadge, Textarea, type DataColumn,
} from "@neton/application-front-kit";

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
    onError: (cause: Error) => setError(cause.message),
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
    onError: (cause: Error) => setError(cause.message),
  });
  const assignRoles = useMutation({
    mutationFn: () => apiWrite<void>("/admin/system/permission/assign-user-role", "POST", { userId: rolesFor!.id, roleIds: selectedRoleIds }),
    onSuccess: () => setRolesFor(null),
    onError: (cause: Error) => setError(cause.message),
  });

  async function openEdit(user: User) {
    setError(null);
    try {
      const detail = await apiFetch<User>(`/admin/system/user/get/${user.id}`);
      setForm({ id: detail.id, username: detail.username, password: "", nickname: detail.nickname, deptId: detail.deptId ? String(detail.deptId) : "", email: detail.email ?? "", mobile: detail.mobile ?? "", gender: detail.gender ?? 0, status: detail.status, remark: detail.remark ?? "" });
    } catch (cause) { setError((cause as Error).message); }
  }
  async function openRoles(user: User) {
    setError(null); setRolesFor(user);
    try { setSelectedRoleIds(await apiFetch<number[]>(`/admin/system/permission/list-user-roles?userId=${user.id}`)); }
    catch (cause) { setError((cause as Error).message); }
  }
  function submitUser(event: React.FormEvent) {
    event.preventDefault(); if (!form) return;
    if (form.username.trim().length < 3 || form.nickname.trim().length < 2 || (!form.id && form.password.length < 8)) {
      setError("用户名至少 3 个字符，昵称至少 2 个字符，新账号密码至少 8 个字符"); return;
    }
    setError(null); save.mutate(form);
  }

  const columns: DataColumn<User>[] = [
    { key: "user", header: "管理员", cell: (user) => <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary)]">{(user.nickname || user.username).slice(0, 1)}</span><div><strong>{user.nickname}</strong><div className="text-xs text-[var(--muted-foreground)]">ID {user.id}</div></div></div> },
    { key: "username", header: "账号", cell: (user) => user.username },
    { key: "mobile", header: "手机号", cell: (user) => user.mobile || "未绑定" },
    { key: "email", header: "邮箱", cell: (user) => user.email || "未绑定" },
    { key: "status", header: "状态", cell: (user) => <StatusBadge active={user.status === 1}>{user.status === 1 ? "启用" : "停用"}</StatusBadge> },
    { key: "created", header: "创建时间", cell: (user) => user.createdAt || "-" },
    { key: "actions", header: "操作", headerClassName: "text-right", className: "text-right", cell: (user) => <RowActions
      primary={[
        ...(canUpdate ? [{ label: "编辑资料", onClick: () => openEdit(user) }] : []),
        ...(canAssignRole ? [{ label: "分配角色", onClick: () => openRoles(user) }] : []),
      ]}
      more={[
        ...(canResetPassword ? [{ label: "重置密码", onClick: () => { setError(null); setPassword(""); setPasswordFor(user); } }] : []),
        ...(canUpdate ? [{ label: user.status === 1 ? "停用账号" : "启用账号", onClick: () => setPending({ type: "status", user }) }] : []),
        ...(canDelete && user.username !== "admin" ? [{ label: "删除账号", danger: true, onClick: () => setPending({ type: "delete", user }) }] : []),
      ]}
    /> },
  ];

  return <div className="space-y-4">
    <PageHeader eyebrow="SYSTEM DIRECTORY" title="管理员管理" description="维护后台账号资料、组织归属、角色、密码和启停状态。" actions={<>{canCreate && <Button onClick={() => { setError(null); setForm({ ...emptyForm }); }}>新增管理员</Button>}<Button variant="outline" onClick={() => users.refetch()}>刷新</Button></>} />
    <FilterPanel onSubmit={(event) => { event.preventDefault(); setPage(1); setFilters({ username: draft.username.trim(), mobile: draft.mobile.trim(), status: draft.status }); }}><div className="admin-filter-grid"><Field label="用户名"><Input value={draft.username} onChange={(event) => setDraft({ ...draft, username: event.target.value })} placeholder="输入用户名" /></Field><Field label="手机号"><Input value={draft.mobile} onChange={(event) => setDraft({ ...draft, mobile: event.target.value })} placeholder="输入手机号" /></Field><Field label="状态"><Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">全部状态</option><option value="1">启用</option><option value="0">停用</option></Select></Field><div className="flex items-end gap-2"><Button type="button" variant="ghost" onClick={() => { const value = { username: "", mobile: "", status: "" }; setDraft(value); setFilters(value); setPage(1); }}>重置</Button><Button type="submit">查询</Button></div></div></FilterPanel>
    {error && !form && !rolesFor && !passwordFor && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <section className="front-surface overflow-hidden rounded-xl"><DataTable columns={columns} rows={users.data?.list ?? []} rowKey={(user) => user.id} loading={users.isPending} error={users.error?.message} minWidth={980} /><Pagination page={page} pageSize={pageSize} total={users.data?.total ?? 0} loading={users.isFetching} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} /></section>

    <Drawer open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? "编辑管理员资料" : "新增管理员"} description="账号用于登录，角色决定可访问的菜单与操作权限。" footer={<><Button variant="ghost" onClick={() => setForm(null)}>取消</Button><Button type="submit" form="system-user-form" disabled={save.isPending}>{save.isPending ? "保存中…" : "保存"}</Button></>}>
      {form && <form id="system-user-form" onSubmit={submitUser} className="space-y-4">{error && <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</div>}<Field label="登录账号"><Input value={form.username} disabled={Boolean(form.id)} onChange={(event) => setForm({ ...form, username: event.target.value })} /></Field>{!form.id && <Field label="初始密码"><Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="至少 8 个字符" /></Field>}<Field label="显示昵称"><Input value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></Field><Field label="所属部门"><Select value={form.deptId} onChange={(event) => setForm({ ...form, deptId: event.target.value })}><option value="">不指定部门</option>{(depts.data ?? []).map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</Select></Field><div className="grid grid-cols-2 gap-3"><Field label="手机号"><Input value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} /></Field><Field label="邮箱"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="性别"><Select value={form.gender} onChange={(event) => setForm({ ...form, gender: Number(event.target.value) })}><option value="0">未知</option><option value="1">男</option><option value="2">女</option></Select></Field><Field label="状态"><Select value={form.status} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}><option value="1">启用</option><option value="0">停用</option></Select></Field></div><Field label="备注"><Textarea value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} /></Field></form>}
    </Drawer>

    <Drawer open={Boolean(rolesFor)} onClose={() => setRolesFor(null)} title="分配角色" description={`${rolesFor?.nickname ?? ""}（${rolesFor?.username ?? ""}）`} footer={<><Button variant="ghost" onClick={() => setRolesFor(null)}>取消</Button><Button onClick={() => assignRoles.mutate()} disabled={selectedRoleIds.length === 0 || assignRoles.isPending}>保存角色</Button></>}>
      <div className="space-y-2">{error && <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</div>}{roles.isPending ? <div className="text-sm text-[var(--muted-foreground)]">加载角色…</div> : (roles.data ?? []).map((role) => <label key={role.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--muted)]"><input type="checkbox" checked={selectedRoleIds.includes(role.id)} onChange={(event) => setSelectedRoleIds(event.target.checked ? [...selectedRoleIds, role.id] : selectedRoleIds.filter((id) => id !== role.id))} /><span><strong className="block text-sm">{role.name}</strong><span className="text-xs text-[var(--muted-foreground)]">{role.code}</span></span></label>)}</div>
    </Drawer>

    <Drawer open={Boolean(passwordFor)} onClose={() => setPasswordFor(null)} title="重置密码" description={`为 ${passwordFor?.username ?? ""} 设置新的登录密码`} footer={<><Button variant="ghost" onClick={() => setPasswordFor(null)}>取消</Button><Button onClick={() => resetPassword.mutate()} disabled={password.length < 8 || resetPassword.isPending}>确认重置</Button></>}><div className="space-y-4">{error && <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</div>}<Field label="新密码"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8-128 个字符" /></Field><p className="text-xs leading-5 text-[var(--muted-foreground)]">重置后旧密码立即失效，请通过安全渠道通知账号持有人。</p></div></Drawer>

    <ConfirmDialog open={Boolean(pending)} title={pending?.type === "delete" ? "删除管理员" : pending?.user.status === 1 ? "停用管理员" : "启用管理员"} description={pending?.type === "delete" ? `确认删除账号 ${pending.user.username}？该操作不可恢复。` : `确认${pending?.user.status === 1 ? "停用" : "启用"}账号 ${pending?.user.username ?? ""}？`} confirmLabel="确认操作" pending={destructiveAction.isPending} onCancel={() => setPending(null)} onConfirm={() => pending && destructiveAction.mutate(pending)} />
  </div>;
}
