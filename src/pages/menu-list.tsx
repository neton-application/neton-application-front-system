"use client";

import * as React from "react";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { useMutation, usePermission, useQuery, useQueryClient } from "@neton/application-front-runtime/client-context";
import {
  Button,
  ChevronRightIcon,
  ConfirmDialog,
  DataTable,
  Drawer,
  Field,
  FilterPanel,
  Input,
  PageHeader,
  RowActions,
  Select,
  StatusBadge,
  type DataColumn,
} from "@neton/application-front-kit";

interface MenuItem {
  id: number;
  name: string;
  permission?: string | null;
  type: number;
  parentId: number;
  path?: string | null;
  component?: string | null;
  icon?: string | null;
  sort: number;
  status: number;
}

interface VisibleMenu extends MenuItem { depth: number; }
type MenuFormState = Omit<MenuItem, "id"> & { id?: number };

const emptyMenu: MenuFormState = { name: "", permission: "", type: 2, parentId: 0, path: "", component: "", icon: "", sort: 0, status: 1 };

function orderMenus(items: MenuItem[]): VisibleMenu[] {
  const children = new Map<number, MenuItem[]>();
  for (const item of items) children.set(item.parentId, [...(children.get(item.parentId) ?? []), item]);
  for (const values of children.values()) values.sort((left, right) => left.sort - right.sort || left.id - right.id);
  const output: VisibleMenu[] = [];
  const walk = (parentId: number, depth: number) => {
    for (const item of children.get(parentId) ?? []) {
      output.push({ ...item, depth });
      walk(item.id, depth + 1);
    }
  };
  walk(0, 0);
  return output;
}

export default function SystemMenuListPage() {
  const queryClient = useQueryClient();
  const canCreate = usePermission("system:menu:create");
  const canUpdate = usePermission("system:menu:update");
  const canDelete = usePermission("system:menu:delete");
  const [draft, setDraft] = React.useState({ name: "", type: "", status: "" });
  const [filters, setFilters] = React.useState(draft);
  const [form, setForm] = React.useState<MenuFormState | null>(null);
  const [deleting, setDeleting] = React.useState<MenuItem | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(() => new Set());

  const query = useQuery({
    queryKey: ["system", "menus"],
    queryFn: () => apiFetch<MenuItem[]>("/admin/system/menu/list"),
  });

  const saveMutation = useMutation({
    mutationFn: (value: MenuFormState) => apiWrite<void>(
      value.id ? "/admin/system/menu/update" : "/admin/system/menu/create",
      value.id ? "PUT" : "POST",
      {
        ...value,
        permission: value.permission || null,
        path: value.path || null,
        component: value.type === 2 ? value.component || null : null,
        icon: value.icon || null,
      },
    ),
    onSuccess: async () => {
      setForm(null);
      await queryClient.invalidateQueries({ queryKey: ["system", "menus"] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (menu: MenuItem) => apiWrite<void>(`/admin/system/menu/delete/${menu.id}`, "DELETE"),
    onSuccess: async () => {
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: ["system", "menus"] });
    },
  });

  const ordered = React.useMemo(() => orderMenus(query.data ?? []), [query.data]);
  const menuById = React.useMemo(() => new Map((query.data ?? []).map((menu) => [menu.id, menu])), [query.data]);
  const parentIds = React.useMemo(() => new Set((query.data ?? []).filter((menu) => menu.parentId !== 0).map((menu) => menu.parentId)), [query.data]);
  const filtering = Boolean(filters.name || filters.type || filters.status);
  const matchingIds = new Set(ordered.filter((menu) => {
    const nameMatches = !filters.name || menu.name.toLowerCase().includes(filters.name.toLowerCase()) || menu.permission?.toLowerCase().includes(filters.name.toLowerCase());
    return nameMatches && (!filters.type || menu.type === Number(filters.type)) && (!filters.status || menu.status === Number(filters.status));
  }).map((menu) => menu.id));
  const filteredPathIds = new Set(matchingIds);
  if (filtering) {
    for (const id of matchingIds) {
      let parentId = menuById.get(id)?.parentId ?? 0;
      while (parentId !== 0) {
        filteredPathIds.add(parentId);
        parentId = menuById.get(parentId)?.parentId ?? 0;
      }
    }
  }
  const visibleRows = filtering
    ? ordered.filter((menu) => filteredPathIds.has(menu.id))
    : ordered.filter((menu) => {
      let parentId = menu.parentId;
      while (parentId !== 0) {
        if (!expandedIds.has(parentId)) return false;
        parentId = menuById.get(parentId)?.parentId ?? 0;
      }
      return true;
    });

  function toggleExpanded(id: number) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const columns: DataColumn<VisibleMenu>[] = [
    { key: "name", header: "菜单名称", cell: (menu) => <div className="flex items-center gap-1.5" style={{ paddingLeft: menu.depth * 20 }}>
      {parentIds.has(menu.id) ? <button type="button" aria-label={`${expandedIds.has(menu.id) ? "折叠" : "展开"}${menu.name}`} aria-expanded={filtering || expandedIds.has(menu.id)} disabled={filtering} onClick={() => toggleExpanded(menu.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] shadow-[var(--shadow-xs)] transition hover:border-[var(--input)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:pointer-events-none">
        <ChevronRightIcon aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${expandedIds.has(menu.id) || filtering ? "rotate-90" : ""}`} strokeWidth={1.9} />
      </button> : <span aria-hidden="true" className="h-7 w-7 shrink-0" />}
      <span className={menu.depth === 0 ? "font-semibold text-[var(--foreground)]" : "font-medium text-[var(--body-foreground)]"}>{menu.name}</span>
    </div> },
    { key: "type", header: "类型", cell: (menu) => <span className="rounded bg-[var(--muted)] px-2 py-1 text-xs font-bold text-[var(--muted-foreground)]">{menu.type === 1 ? "目录" : menu.type === 2 ? "页面" : "按钮"}</span> },
    { key: "path", header: "路由", cell: (menu) => menu.path ? <code className="text-xs text-[var(--primary)]">{menu.path}</code> : "-" },
    { key: "component", header: "组件 Key", cell: (menu) => menu.component ? <code className="text-xs">{menu.component}</code> : "-" },
    { key: "permission", header: "权限标识", cell: (menu) => menu.permission ? <code className="text-xs text-[#735a32]">{menu.permission}</code> : "-" },
    { key: "sort", header: "排序", cell: (menu) => menu.sort },
    { key: "status", header: "状态", cell: (menu) => <StatusBadge active={menu.status === 1}>{menu.status === 1 ? "启用" : "停用"}</StatusBadge> },
    {
      key: "actions",
      header: "操作",
      headerClassName: "text-right",
      className: "text-right",
      cell: (menu) => <RowActions primary={[...(canUpdate ? [{ label: "编辑", tone: "primary" as const, onClick: () => { setFormError(null); setForm({ ...menu }); } }] : []), ...(canCreate && menu.type !== 3 ? [{ label: "新增下级", tone: "positive" as const, onClick: () => { setFormError(null); setForm({ ...emptyMenu, parentId: menu.id }); } }] : [])]} more={canDelete ? [{ label: "删除", danger: true, onClick: () => setDeleting(menu) }] : []} />,
    },
  ];

  function submitMenu(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    if (!form.name.trim()) return setFormError("菜单名称不能为空");
    if (form.type === 2 && !form.component?.trim()) return setFormError("页面菜单必须填写组件 Key");
    setFormError(null);
    saveMutation.mutate({ ...form, name: form.name.trim(), permission: form.permission?.trim(), path: form.path?.trim(), component: form.component?.trim(), icon: form.icon?.trim() });
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="NAVIGATION REGISTRY" title="菜单管理" description="后端菜单决定权限与可见性，组件 Key 必须与已安装前端模块 manifest 一致。" actions={<>{canCreate && <Button onClick={() => { setFormError(null); setForm({ ...emptyMenu }); }}>新增菜单</Button>}<Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>刷新</Button></>} />
      <FilterPanel onSubmit={(event) => { event.preventDefault(); setFilters({ name: draft.name.trim(), type: draft.type, status: draft.status }); }}>
        <div className="admin-filter-grid">
          <Field label="名称或权限"><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="输入菜单名称或权限标识" /></Field>
          <Field label="菜单类型"><Select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option value="">全部类型</option><option value="1">目录</option><option value="2">页面</option><option value="3">按钮</option></Select></Field>
          <Field label="状态"><Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">全部状态</option><option value="1">启用</option><option value="0">停用</option></Select></Field>
          <div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => { const next = { name: "", type: "", status: "" }; setDraft(next); setFilters(next); }}>重置</Button><Button type="submit">筛选</Button></div>
        </div>
      </FilterPanel>
      <section className="front-surface overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-2.5">
          <span className="text-xs font-medium text-[var(--muted-foreground)]">显示 {visibleRows.length} / 共 {query.data?.length ?? 0} 项</span>
          <div className="flex items-center gap-1">
            <span className="mr-2 text-xs text-[var(--muted-foreground)]">按层级和显示顺序排列</span>
            {!filtering && <><Button variant="ghost" size="sm" onClick={() => setExpandedIds(new Set(parentIds))}>展开全部</Button><Button variant="ghost" size="sm" onClick={() => setExpandedIds(new Set())}>折叠全部</Button></>}
          </div>
        </div>
        <DataTable columns={columns} rows={visibleRows} rowKey={(menu) => menu.id} loading={query.isPending} error={query.error?.message} minWidth={1220} />
      </section>

      <Drawer open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? "编辑菜单" : "新增菜单"} widthClassName="max-w-xl" footer={<><Button variant="ghost" onClick={() => setForm(null)}>取消</Button><Button type="submit" form="menu-form" disabled={saveMutation.isPending}>{saveMutation.isPending ? "保存中…" : "保存菜单"}</Button></>}>
        {form && <form id="menu-form" onSubmit={submitMenu} className="space-y-4">
          {formError && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
          <Field label="上级菜单"><Select value={form.parentId} onChange={(event) => setForm({ ...form, parentId: Number(event.target.value) })}><option value="0">顶级菜单</option>{ordered.filter((menu) => menu.type !== 3 && menu.id !== form.id).map((menu) => <option key={menu.id} value={menu.id}>{"　".repeat(menu.depth)}{menu.name}</option>)}</Select></Field>
          <Field label="菜单名称"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="菜单类型"><Select value={form.type} onChange={(event) => setForm({ ...form, type: Number(event.target.value) })}><option value="1">目录</option><option value="2">页面</option><option value="3">按钮</option></Select></Field>
          {form.type !== 3 && <Field label="路由地址"><Input value={form.path ?? ""} onChange={(event) => setForm({ ...form, path: event.target.value })} placeholder={form.parentId === 0 ? "/system" : "user"} /></Field>}
          {form.type === 2 && <Field label="组件 Key"><Input value={form.component ?? ""} onChange={(event) => setForm({ ...form, component: event.target.value })} placeholder="system/user/index" /></Field>}
          {form.type !== 1 && <Field label="权限标识"><Input value={form.permission ?? ""} onChange={(event) => setForm({ ...form, permission: event.target.value })} placeholder="system:user:query" /></Field>}
          {form.type !== 3 && <Field label="图标"><Input value={form.icon ?? ""} onChange={(event) => setForm({ ...form, icon: event.target.value })} placeholder="ant-design:user-outlined" /></Field>}
          <div className="grid grid-cols-2 gap-3"><Field label="显示顺序"><Input type="number" min={0} max={9999} value={form.sort} onChange={(event) => setForm({ ...form, sort: Number(event.target.value) })} /></Field><Field label="状态"><Select value={form.status} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}><option value="1">启用</option><option value="0">停用</option></Select></Field></div>
        </form>}
      </Drawer>

      <ConfirmDialog open={Boolean(deleting)} title="删除菜单" description={`确定删除“${deleting?.name ?? ""}”吗？存在下级菜单时服务端会拒绝该操作。`} confirmLabel="确认删除" pending={deleteMutation.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting)} />
    </div>
  );
}
