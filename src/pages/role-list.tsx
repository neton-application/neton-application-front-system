"use client";

import * as React from "react";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { useMutation, usePermission, useQuery, useQueryClient } from "@neton/application-front-runtime/client-context";
import type { PageResponse } from "@neton/application-front-runtime/types";
import {
  Button,
  ConfirmDialog,
  DataTable,
  Drawer,
  Field,
  FilterPanel,
  Input,
  PageHeader,
  Pagination,
  RowActions,
  Select,
  StatusBadge,
  Textarea,
  type DataColumn,
} from "@neton/application-front-kit";

interface Role {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  status: number;
}

interface Menu { id: number; name: string; permission?: string | null; type: number; parentId: number; status: number }
interface MenuTreeNode extends Menu { children: MenuTreeNode[] }

interface RoleFormState {
  id?: number;
  code: string;
  name: string;
  description: string;
  sort: number;
  status: number;
}

const emptyRole: RoleFormState = { code: "", name: "", description: "", sort: 0, status: 1 };

function buildMenuTree(menus: Menu[]): MenuTreeNode[] {
  const nodes = new Map<number, MenuTreeNode>();
  for (const menu of menus) nodes.set(menu.id, { ...menu, children: [] });

  const roots: MenuTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(node.parentId);
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function collectMenuIds(node: MenuTreeNode): number[] {
  return [node.id, ...node.children.flatMap(collectMenuIds)];
}

function MenuPermissionNode({
  depth,
  disabled,
  node,
  onToggle,
  selected,
}: {
  depth: number;
  disabled?: boolean;
  node: MenuTreeNode;
  onToggle: (node: MenuTreeNode, checked: boolean) => void;
  selected: Set<number>;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const subtreeIds = React.useMemo(() => collectMenuIds(node), [node]);
  const selectedCount = subtreeIds.filter((id) => selected.has(id)).length;
  const checked = selectedCount === subtreeIds.length;
  const indeterminate = selectedCount > 0 && !checked;
  const checkboxRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const typeLabel = node.type === 1 ? "目录" : node.type === 2 ? "页面" : "操作";
  return (
    <div>
      <div
        className="group flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--muted)]"
        style={{ paddingLeft: `${8 + depth * 24}px` }}
      >
        <button
          type="button"
          aria-label={expanded ? `收起${node.name}` : `展开${node.name}`}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--card)] ${node.children.length === 0 ? "invisible" : ""}`}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className={`text-sm transition-transform ${expanded ? "rotate-90" : ""}`}>›</span>
        </button>
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onToggle(node, event.target.checked)}
            className="h-4 w-4 shrink-0 accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
          />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <strong className="truncate text-sm font-medium text-[var(--foreground)]">{node.name}</strong>
              <span className="shrink-0 rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">{typeLabel}</span>
            </span>
            {node.permission && <span className="block truncate font-mono text-[11px] text-[var(--muted-foreground)]">{node.permission}</span>}
          </span>
        </label>
      </div>
      {expanded && node.children.map((child) => (
        <MenuPermissionNode key={child.id} depth={depth + 1} disabled={disabled} node={child} onToggle={onToggle} selected={selected} />
      ))}
    </div>
  );
}

export default function SystemRoleListPage() {
  const queryClient = useQueryClient();
  const canCreate = usePermission("system:role:create");
  const canUpdate = usePermission("system:role:update");
  const canDelete = usePermission("system:role:delete");
  const canAssignPermission = usePermission("system:permission:assign");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [draft, setDraft] = React.useState({ name: "", code: "", status: "" });
  const [filters, setFilters] = React.useState(draft);
  const [form, setForm] = React.useState<RoleFormState | null>(null);
  const [deleting, setDeleting] = React.useState<Role | null>(null);
  const [permissionRole, setPermissionRole] = React.useState<Role | null>(null);
  const [selectedMenuIds, setSelectedMenuIds] = React.useState<number[]>([]);
  const [formError, setFormError] = React.useState<string | null>(null);

  const params = new URLSearchParams({ pageNo: String(page), pageSize: String(pageSize) });
  if (filters.name) params.set("name", filters.name);
  if (filters.code) params.set("code", filters.code);
  if (filters.status) params.set("status", filters.status);

  const query = useQuery({
    queryKey: ["system", "roles", page, pageSize, filters],
    queryFn: () => apiFetch<PageResponse<Role>>(`/admin/system/role/page?${params}`),
  });

  const menus = useQuery({
    queryKey: ["system", "simple-menus"],
    queryFn: () => apiFetch<Menu[]>("/admin/system/menu/simple-list"),
    enabled: Boolean(permissionRole),
  });

  const saveMutation = useMutation({
    mutationFn: (value: RoleFormState) => apiWrite<void>(
      value.id ? "/admin/system/role/update" : "/admin/system/role/create",
      value.id ? "PUT" : "POST",
      { ...value, description: value.description || null },
    ),
    onSuccess: async () => {
      setForm(null);
      await queryClient.invalidateQueries({ queryKey: ["system", "roles"] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (role: Role) => apiWrite<void>(`/admin/system/role/delete/${role.id}`, "DELETE"),
    onSuccess: async () => {
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: ["system", "roles"] });
    },
  });

  const assignMenuMutation = useMutation({
    mutationFn: () => apiWrite<void>("/admin/system/permission/assign-role-menu", "POST", { roleId: permissionRole!.id, menuIds: selectedMenuIds }),
    onSuccess: () => setPermissionRole(null),
    onError: (error: Error) => setFormError(error.message),
  });

  const menuTree = React.useMemo(() => buildMenuTree(menus.data ?? []), [menus.data]);
  const protectedRole = permissionRole?.code === "super_admin";
  const effectiveSelectedMenuIds = protectedRole ? (menus.data ?? []).map((menu) => menu.id) : selectedMenuIds;
  const selectedMenuIdSet = React.useMemo(() => new Set(effectiveSelectedMenuIds), [effectiveSelectedMenuIds]);

  function toggleMenuNode(node: MenuTreeNode, checked: boolean) {
    if (protectedRole) return;
    const allMenus = menus.data ?? [];
    const next = new Set(selectedMenuIds);
    const subtreeIds = collectMenuIds(node);
    if (checked) {
      subtreeIds.forEach((id) => next.add(id));
      let parentId = node.parentId;
      while (parentId !== 0) {
        next.add(parentId);
        parentId = allMenus.find((menu) => menu.id === parentId)?.parentId ?? 0;
      }
    } else {
      subtreeIds.forEach((id) => next.delete(id));
      let parentId = node.parentId;
      while (parentId !== 0) {
        const parent = allMenus.find((menu) => menu.id === parentId);
        if (!parent) break;
        const siblingIds = allMenus.filter((menu) => menu.parentId === parentId).map((menu) => menu.id);
        if (!siblingIds.some((id) => next.has(id))) next.delete(parentId);
        parentId = parent.parentId;
      }
    }
    setSelectedMenuIds([...next]);
  }

  async function openMenuPermission(role: Role) {
    setFormError(null);
    setPermissionRole(role);
    if (role.code === "super_admin") {
      setSelectedMenuIds([]);
      return;
    }
    try {
      setSelectedMenuIds(await apiFetch<number[]>(`/admin/system/permission/list-role-menus?roleId=${role.id}`));
    } catch (error) {
      setFormError((error as Error).message);
    }
  }

  const columns: DataColumn<Role>[] = [
    { key: "id", header: "角色编号", cell: (role) => <span className="font-mono text-xs">{role.id}</span> },
    { key: "name", header: "角色名称", cell: (role) => <span className="font-semibold text-[var(--foreground)]">{role.name}</span> },
    { key: "code", header: "角色标识", cell: (role) => <code className="rounded bg-[var(--muted)] px-2 py-1 text-xs text-[var(--primary)]">{role.code}</code> },
    { key: "description", header: "说明", cell: (role) => role.description || <span className="text-[var(--muted-foreground)]">未填写</span> },
    { key: "status", header: "状态", cell: (role) => <StatusBadge active={role.status === 1}>{role.status === 1 ? "启用" : "停用"}</StatusBadge> },
    {
      key: "actions",
      header: "操作",
      headerClassName: "text-right",
      className: "text-right",
      cell: (role) => <RowActions
        primary={[
          ...(canUpdate ? [{ label: "编辑", onClick: () => { setFormError(null); setForm({ id: role.id, code: role.code, name: role.name, description: role.description ?? "", sort: 0, status: role.status }); } }] : []),
          ...(canAssignPermission ? [{ label: role.code === "super_admin" ? "查看权限" : "菜单权限", onClick: () => openMenuPermission(role) }] : []),
        ]}
        more={canDelete && role.code !== "super_admin" ? [{ label: "删除角色", danger: true, onClick: () => setDeleting(role) }] : []}
      />,
    },
  ];

  function submitFilters(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters({ name: draft.name.trim(), code: draft.code.trim(), status: draft.status });
  }

  function submitRole(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    if (form.name.trim().length < 2 || form.code.trim().length < 2) {
      setFormError("角色名称和标识至少需要 2 个字符");
      return;
    }
    setFormError(null);
    saveMutation.mutate({ ...form, name: form.name.trim(), code: form.code.trim(), description: form.description.trim() });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="ACCESS CONTROL"
        title="角色管理"
        description="维护后台角色与稳定的权限标识。超级管理员角色受到保护。"
        actions={<>{canCreate && <Button onClick={() => { setFormError(null); setForm({ ...emptyRole }); }}>新增角色</Button>}<Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>刷新</Button></>}
      />

      <FilterPanel onSubmit={submitFilters}>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
          <Field label="角色名称"><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="输入角色名称" /></Field>
          <Field label="角色标识"><Input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder="例如 operator" /></Field>
          <Field label="状态"><Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">全部状态</option><option value="1">启用</option><option value="0">停用</option></Select></Field>
          <div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => { const next = { name: "", code: "", status: "" }; setDraft(next); setFilters(next); setPage(1); }}>重置</Button><Button type="submit">查询</Button></div>
        </div>
      </FilterPanel>

      <section className="front-surface overflow-hidden rounded-xl">
        <DataTable columns={columns} rows={query.data?.list ?? []} rowKey={(role) => role.id} loading={query.isPending} error={query.error?.message} />
        <Pagination page={page} pageSize={pageSize} total={query.data?.total ?? 0} loading={query.isFetching} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
      </section>

      <Drawer
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? "编辑角色" : "新增角色"}
        description="角色标识将用于服务端权限判断，保存后请谨慎修改。"
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>取消</Button><Button type="submit" form="role-form" disabled={saveMutation.isPending}>{saveMutation.isPending ? "保存中…" : "保存角色"}</Button></>}
      >
        {form && (
          <form id="role-form" onSubmit={submitRole} className="space-y-4">
            {formError && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
            <Field label="角色名称"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如 运营人员" /></Field>
            <Field label="角色标识"><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="例如 operator" disabled={form.code === "super_admin"} /></Field>
            <Field label="显示顺序"><Input type="number" min={0} max={9999} value={form.sort} onChange={(event) => setForm({ ...form, sort: Number(event.target.value) })} /></Field>
            <Field label="状态"><Select value={form.status} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}><option value="1">启用</option><option value="0">停用</option></Select></Field>
            <Field label="说明"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="描述该角色的职责范围" /></Field>
          </form>
        )}
      </Drawer>

      <Drawer
        open={Boolean(permissionRole)}
        onClose={() => setPermissionRole(null)}
        title="分配菜单权限"
        description={protectedRole ? `${permissionRole?.name ?? ""}是系统内置全权限角色，权限不可修改` : `${permissionRole?.name ?? ""}（${permissionRole?.code ?? ""}）`}
        widthClassName="max-w-2xl"
        footer={protectedRole
          ? <div className="flex w-full items-center justify-between gap-3"><span className="text-xs text-[var(--muted-foreground)]">系统默认拥有全部 <strong className="text-[var(--foreground)]">{menus.data?.length ?? 0}</strong> 项权限</span><Button onClick={() => setPermissionRole(null)}>关闭</Button></div>
          : <div className="flex w-full items-center justify-between gap-3"><span className="text-xs text-[var(--muted-foreground)]">已选择 <strong className="text-[var(--foreground)]">{selectedMenuIds.length}</strong> 项</span><div className="flex gap-2"><Button variant="ghost" onClick={() => setPermissionRole(null)}>取消</Button><Button variant="outline" onClick={() => setSelectedMenuIds(selectedMenuIds.length === (menus.data?.length ?? 0) ? [] : (menus.data ?? []).map((menu) => menu.id))}>{selectedMenuIds.length === (menus.data?.length ?? 0) ? "清空选择" : "全部选择"}</Button><Button onClick={() => assignMenuMutation.mutate()} disabled={assignMenuMutation.isPending}>{assignMenuMutation.isPending ? "保存中…" : "保存权限"}</Button></div></div>}
      >
        <div className="space-y-3">
          {protectedRole && <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">i</span><span>超级管理员权限由系统保证，不依赖角色菜单关联记录。此处仅展示当前全部可用权限，不能取消或重新分配。</span></div>}
          {formError && <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{formError}</div>}
          {menus.isPending ? <div className="text-sm text-[var(--muted-foreground)]">加载菜单权限…</div> : menus.error ? <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{menus.error.message}</div> : <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-2">
            {menuTree.map((node) => <MenuPermissionNode key={node.id} depth={0} disabled={protectedRole} node={node} onToggle={toggleMenuNode} selected={selectedMenuIdSet} />)}
            {menuTree.length === 0 && <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">暂无可分配菜单</div>}
          </div>}
        </div>
      </Drawer>

      <ConfirmDialog open={Boolean(deleting)} title="删除角色" description={`确定删除“${deleting?.name ?? ""}”吗？已分配该角色的账号可能立即失去权限。`} confirmLabel="确认删除" pending={deleteMutation.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting)} />
    </div>
  );
}
