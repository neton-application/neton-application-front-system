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
import { useT } from "@neton/application-front-runtime/i18n";
import { useDescribeError } from "@neton/application-front-runtime/errors";

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
  const t = useT("system");
  const [expanded, setExpanded] = React.useState(true);
  const subtreeIds = React.useMemo(() => collectMenuIds(node), [node]);
  const selectedCount = subtreeIds.filter((id) => selected.has(id)).length;
  const checked = selectedCount === subtreeIds.length;
  const indeterminate = selectedCount > 0 && !checked;
  const checkboxRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const typeLabel = node.type === 1 ? t("menu.type.directory") : node.type === 2 ? t("menu.type.page") : t("role.menuType.action");
  return (
    <div>
      <div
        className="group flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--muted)]"
        style={{ paddingLeft: `${8 + depth * 24}px` }}
      >
        <button
          type="button"
          aria-label={expanded ? t("common.collapseItem", { name: node.name }) : t("common.expandItem", { name: node.name })}
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
  const t = useT("system");
  const describeError = useDescribeError();
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
    onError: (error: Error) => setFormError(describeError(error)),
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
    onError: (error: Error) => setFormError(describeError(error)),
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
      setFormError(describeError(error));
    }
  }

  const columns: DataColumn<Role>[] = [
    { key: "id", header: t("role.field.id"), cell: (role) => <span className="font-mono text-xs">{role.id}</span> },
    { key: "name", header: t("role.field.name"), cell: (role) => <span className="font-semibold text-[var(--foreground)]">{role.name}</span> },
    { key: "code", header: t("role.field.code"), cell: (role) => <code className="rounded bg-[var(--muted)] px-2 py-1 text-xs text-[var(--primary)]">{role.code}</code> },
    { key: "description", header: t("common.remark"), cell: (role) => role.description || <span className="text-[var(--muted-foreground)]">{t("role.notFilled")}</span> },
    { key: "status", header: t("common.status"), cell: (role) => <StatusBadge active={role.status === 1}>{role.status === 1 ? t("common.enabled") : t("common.disabled")}</StatusBadge> },
    {
      key: "actions",
      header: t("common.actions"),
      headerClassName: "text-right",
      className: "text-right",
      cell: (role) => <RowActions
        primary={[
          ...(canUpdate ? [{ label: t("common.edit"), kind: "edit" as const, onClick: () => { setFormError(null); setForm({ id: role.id, code: role.code, name: role.name, description: role.description ?? "", sort: 0, status: role.status }); } }] : []),
          ...(canAssignPermission ? [{ label: role.code === "super_admin" ? t("role.action.viewPermissions") : t("role.action.menuPermissions"), kind: role.code === "super_admin" ? "view" as const : "assign" as const, onClick: () => openMenuPermission(role) }] : []),
        ]}
        more={canDelete && role.code !== "super_admin" ? [{ label: t("role.action.delete"), kind: "delete" as const, danger: true, onClick: () => setDeleting(role) }] : []}
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
      setFormError(t("role.error.invalidForm"));
      return;
    }
    setFormError(null);
    saveMutation.mutate({ ...form, name: form.name.trim(), code: form.code.trim(), description: form.description.trim() });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={t("role.eyebrow")}
        title={t("role.title")}
        description={t("role.description")}
        actions={<>{canCreate && <Button onClick={() => { setFormError(null); setForm({ ...emptyRole }); }}>{t("role.action.create")}</Button>}<Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>{t("common.refresh")}</Button></>}
      />

      <FilterPanel onSubmit={submitFilters}>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
          <Field label={t("role.field.name")}><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t("role.placeholder.nameSearch")} /></Field>
          <Field label={t("role.field.code")}><Input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder={t("role.placeholder.code")} /></Field>
          <Field label={t("common.status")}><Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">{t("common.allStatus")}</option><option value="1">{t("common.enabled")}</option><option value="0">{t("common.disabled")}</option></Select></Field>
          <div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => { const next = { name: "", code: "", status: "" }; setDraft(next); setFilters(next); setPage(1); }}>{t("common.reset")}</Button><Button type="submit">{t("common.search")}</Button></div>
        </div>
      </FilterPanel>

      <section className="front-surface overflow-hidden rounded-xl">
        <DataTable columns={columns} rows={query.data?.list ?? []} rowKey={(role) => role.id} loading={query.isPending} error={query.error ? describeError(query.error) : null} />
        <Pagination page={page} pageSize={pageSize} total={query.data?.total ?? 0} loading={query.isFetching} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
      </section>

      <Drawer
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? t("role.form.editTitle") : t("role.action.create")}
        description={t("role.form.description")}
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>{t("common.cancel")}</Button><Button type="submit" form="role-form" disabled={saveMutation.isPending}>{saveMutation.isPending ? t("common.saving") : t("role.action.save")}</Button></>}
      >
        {form && (
          <form id="role-form" onSubmit={submitRole} className="space-y-4">
            {formError && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
            <Field label={t("role.field.name")}><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t("role.placeholder.name")} /></Field>
            <Field label={t("role.field.code")}><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder={t("role.placeholder.code")} disabled={form.code === "super_admin"} /></Field>
            <Field label={t("common.displayOrder")}><Input type="number" min={0} max={9999} value={form.sort} onChange={(event) => setForm({ ...form, sort: Number(event.target.value) })} /></Field>
            <Field label={t("common.status")}><Select value={form.status} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}><option value="1">{t("common.enabled")}</option><option value="0">{t("common.disabled")}</option></Select></Field>
            <Field label={t("common.remark")}><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={t("role.placeholder.description")} /></Field>
          </form>
        )}
      </Drawer>

      <Drawer
        open={Boolean(permissionRole)}
        onClose={() => setPermissionRole(null)}
        title={t("role.permission.title")}
        description={protectedRole ? t("role.permission.protectedSubject", { name: permissionRole?.name ?? "" }) : t("role.permission.subject", { name: permissionRole?.name ?? "", code: permissionRole?.code ?? "" })}
        widthClassName="max-w-2xl"
        footer={protectedRole
          ? <div className="flex w-full items-center justify-between gap-3"><span className="text-xs text-[var(--muted-foreground)]">{t("role.permission.allGranted", { count: menus.data?.length ?? 0 })}</span><Button onClick={() => setPermissionRole(null)}>{t("common.close")}</Button></div>
          : <div className="flex w-full items-center justify-between gap-3"><span className="text-xs text-[var(--muted-foreground)]">{t("role.permission.selected", { count: selectedMenuIds.length })}</span><div className="flex gap-2"><Button variant="ghost" onClick={() => setPermissionRole(null)}>{t("common.cancel")}</Button><Button variant="outline" onClick={() => setSelectedMenuIds(selectedMenuIds.length === (menus.data?.length ?? 0) ? [] : (menus.data ?? []).map((menu) => menu.id))}>{selectedMenuIds.length === (menus.data?.length ?? 0) ? t("role.permission.clearAll") : t("role.permission.selectAll")}</Button><Button onClick={() => assignMenuMutation.mutate()} disabled={assignMenuMutation.isPending}>{assignMenuMutation.isPending ? t("common.saving") : t("role.permission.save")}</Button></div></div>}
      >
        <div className="space-y-3">
          {protectedRole && <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">i</span><span>{t("role.permission.protectedNotice")}</span></div>}
          {formError && <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{formError}</div>}
          {menus.isPending ? <div className="text-sm text-[var(--muted-foreground)]">{t("role.permission.loading")}</div> : menus.error ? <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{describeError(menus.error)}</div> : <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-2">
            {menuTree.map((node) => <MenuPermissionNode key={node.id} depth={0} disabled={protectedRole} node={node} onToggle={toggleMenuNode} selected={selectedMenuIdSet} />)}
            {menuTree.length === 0 && <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">{t("role.permission.empty")}</div>}
          </div>}
        </div>
      </Drawer>

      <ConfirmDialog open={Boolean(deleting)} title={t("role.action.delete")} description={t("role.confirm.deleteBody", { name: deleting?.name ?? "" })} confirmLabel={t("common.confirmDelete")} pending={deleteMutation.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting)} />
    </div>
  );
}
