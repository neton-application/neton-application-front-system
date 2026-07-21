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
  Input,
  PageHeader,
  Pagination,
  RowActions,
  Select,
  StatusBadge,
  Textarea,
  type DataColumn,
} from "@neton/application-front-kit";

interface DictType {
  id: number;
  name: string;
  type: string;
  status: number;
  remark?: string | null;
}

interface DictData {
  id: number;
  dictType: string;
  label: string;
  value: string;
  sort: number;
  status: number;
  remark?: string | null;
}

type DictTypeForm = Omit<DictType, "id"> & { id?: number };
type DictDataForm = Omit<DictData, "id"> & { id?: number };

const emptyType: DictTypeForm = { name: "", type: "", status: 1, remark: "" };

export default function SystemDictPage() {
  const queryClient = useQueryClient();
  const canCreate = usePermission("system:dict:create");
  const canUpdate = usePermission("system:dict:update");
  const canDelete = usePermission("system:dict:delete");
  const [typeSearchDraft, setTypeSearchDraft] = React.useState("");
  const [typeSearch, setTypeSearch] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<DictType | null>(null);
  const [dataPage, setDataPage] = React.useState(1);
  const [dataPageSize, setDataPageSize] = React.useState(20);
  const [dataDraft, setDataDraft] = React.useState({ label: "", status: "" });
  const [dataFilters, setDataFilters] = React.useState(dataDraft);
  const [typeForm, setTypeForm] = React.useState<DictTypeForm | null>(null);
  const [dataForm, setDataForm] = React.useState<DictDataForm | null>(null);
  const [deletingType, setDeletingType] = React.useState<DictType | null>(null);
  const [deletingData, setDeletingData] = React.useState<DictData | null>(null);
  const [mobileView, setMobileView] = React.useState<"types" | "data">("types");
  const [error, setError] = React.useState<string | null>(null);

  const typeParams = new URLSearchParams({ pageNo: "1", pageSize: "100" });
  if (typeSearch) typeParams.set("keyword", typeSearch);
  const types = useQuery({
    queryKey: ["system", "dict-types", typeSearch],
    queryFn: () => apiFetch<PageResponse<DictType>>(`/admin/system/dict-type/page?${typeParams}`),
  });

  React.useEffect(() => {
    const rows = types.data?.list ?? [];
    if (rows.length === 0) {
      setSelectedType(null);
      return;
    }
    setSelectedType((current) => rows.find((row) => row.id === current?.id) ?? rows[0]);
  }, [types.data]);

  const dataParams = new URLSearchParams({ pageNo: String(dataPage), pageSize: String(dataPageSize) });
  if (selectedType) dataParams.set("dictType", selectedType.type);
  if (dataFilters.label) dataParams.set("label", dataFilters.label);
  if (dataFilters.status) dataParams.set("status", dataFilters.status);
  const values = useQuery({
    queryKey: ["system", "dict-data", selectedType?.type, dataPage, dataPageSize, dataFilters],
    queryFn: () => apiFetch<PageResponse<DictData>>(`/admin/system/dict-data/page?${dataParams}`),
    enabled: Boolean(selectedType),
  });

  const saveType = useMutation({
    mutationFn: (form: DictTypeForm) => apiWrite<void>(`/admin/system/dict-type/${form.id ? "update" : "create"}`, form.id ? "PUT" : "POST", { ...form, remark: form.remark || null }),
    onSuccess: async (_, form) => {
      setTypeForm(null);
      if (form.id) setSelectedType((current) => current?.id === form.id ? { ...current, ...form } as DictType : current);
      await queryClient.invalidateQueries({ queryKey: ["system", "dict-types"] });
    },
    onError: (cause: Error) => setError(cause.message),
  });

  const saveData = useMutation({
    mutationFn: (form: DictDataForm) => apiWrite<void>(`/admin/system/dict-data/${form.id ? "update" : "create"}`, form.id ? "PUT" : "POST", { ...form, remark: form.remark || null }),
    onSuccess: async () => {
      setDataForm(null);
      await queryClient.invalidateQueries({ queryKey: ["system", "dict-data"] });
    },
    onError: (cause: Error) => setError(cause.message),
  });

  const deleteType = useMutation({
    mutationFn: (row: DictType) => apiWrite<void>(`/admin/system/dict-type/delete/${row.id}`, "DELETE"),
    onSuccess: async (_, row) => {
      if (selectedType?.id === row.id) setSelectedType(null);
      setDeletingType(null);
      await queryClient.invalidateQueries({ queryKey: ["system", "dict-types"] });
    },
    onError: (cause: Error) => { setDeletingType(null); setError(cause.message); },
  });

  const deleteData = useMutation({
    mutationFn: (row: DictData) => apiWrite<void>(`/admin/system/dict-data/delete/${row.id}`, "DELETE"),
    onSuccess: async () => {
      setDeletingData(null);
      await queryClient.invalidateQueries({ queryKey: ["system", "dict-data"] });
    },
    onError: (cause: Error) => { setDeletingData(null); setError(cause.message); },
  });

  function selectType(row: DictType) {
    setSelectedType(row);
    setDataPage(1);
    setDataDraft({ label: "", status: "" });
    setDataFilters({ label: "", status: "" });
    setMobileView("data");
  }

  function submitType(event: React.FormEvent) {
    event.preventDefault();
    if (!typeForm) return;
    if (!typeForm.name.trim() || !typeForm.type.trim()) {
      setError("请填写字典名称和类型标识");
      return;
    }
    setError(null);
    saveType.mutate({ ...typeForm, name: typeForm.name.trim(), type: typeForm.type.trim(), remark: typeForm.remark?.trim() });
  }

  function submitData(event: React.FormEvent) {
    event.preventDefault();
    if (!dataForm) return;
    if (!dataForm.label.trim() || !dataForm.value.trim()) {
      setError("请填写显示标签和字典值");
      return;
    }
    setError(null);
    saveData.mutate({ ...dataForm, label: dataForm.label.trim(), value: dataForm.value.trim(), remark: dataForm.remark?.trim() });
  }

  const columns: DataColumn<DictData>[] = [
    { key: "label", header: "显示标签", cell: (row) => <span className="font-medium">{row.label}</span> },
    { key: "value", header: "字典值", cell: (row) => <code className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs text-[var(--primary)]">{row.value}</code> },
    { key: "sort", header: "排序", cell: (row) => row.sort },
    { key: "status", header: "状态", cell: (row) => <StatusBadge active={row.status === 1}>{row.status === 1 ? "启用" : "停用"}</StatusBadge> },
    { key: "remark", header: "说明", cell: (row) => row.remark || <span className="text-[var(--muted-foreground)]">-</span> },
    {
      key: "actions", header: "操作", headerClassName: "text-right", className: "text-right",
      cell: (row) => <RowActions
        primary={canUpdate ? [{ label: "编辑", onClick: () => { setError(null); setDataForm({ ...row, remark: row.remark ?? "" }); } }] : []}
        more={canDelete ? [{ label: "删除", danger: true, onClick: () => setDeletingData(row) }] : []}
      />,
    },
  ];

  return <div className="space-y-4">
    <PageHeader
      eyebrow="DATA DICTIONARY"
      title="字典管理"
      description="集中维护稳定的枚举集合及其显示标签；业务配置、文案和高频动态数据不应放入字典。"
      actions={<Button variant="outline" onClick={() => { types.refetch(); if (selectedType) values.refetch(); }}>刷新</Button>}
    />

    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div>}

    <div className="front-surface overflow-hidden rounded-xl">
      <div className="flex border-b border-[var(--border)] p-2 lg:hidden">
        <button type="button" onClick={() => setMobileView("types")} className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${mobileView === "types" ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>字典类型</button>
        <button type="button" onClick={() => setMobileView("data")} className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${mobileView === "data" ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>字典项</button>
      </div>

      <div className="grid min-h-[620px] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`${mobileView === "data" ? "hidden" : "flex"} min-w-0 flex-col border-r-0 border-[var(--border)] bg-[var(--muted)] lg:flex lg:border-r`}>
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-semibold">字典类型</h2><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">定义稳定的枚举集合</p></div>
              {canCreate && <Button size="sm" onClick={() => { setError(null); setTypeForm({ ...emptyType }); }}>新增类型</Button>}
            </div>
            <form className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={(event) => { event.preventDefault(); setTypeSearch(typeSearchDraft.trim()); }}>
              <Input value={typeSearchDraft} onChange={(event) => setTypeSearchDraft(event.target.value)} placeholder="搜索标题或 key" className="h-9 min-w-0 bg-[var(--card)] text-xs" />
              <Button type="submit" variant="outline" size="sm" className="whitespace-nowrap px-3">查询</Button>
            </form>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {types.isPending ? <div className="p-4 text-xs text-[var(--muted-foreground)]">正在加载字典类型…</div> : (types.data?.list ?? []).map((row) => {
              const active = selectedType?.id === row.id;
              return <div key={row.id} className={`rounded-lg border transition ${active ? "border-blue-300 bg-[var(--card)] shadow-[var(--shadow-xs)] dark:border-blue-800" : "border-transparent hover:border-[var(--border)] hover:bg-[var(--card)]"}`}>
                <button type="button" onClick={() => selectType(row)} className="w-full px-3 py-2.5 text-left">
                  <span className="flex items-center justify-between gap-2"><span className="min-w-0"><strong className="block truncate text-xs font-semibold">{row.name}</strong><code className="mt-0.5 block truncate text-[10px] text-[var(--muted-foreground)]">{row.type}</code></span><StatusBadge active={row.status === 1}>{row.status === 1 ? "启用" : "停用"}</StatusBadge></span>
                </button>
              </div>;
            })}
            {!types.isPending && (types.data?.list.length ?? 0) === 0 && <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">没有匹配的字典类型</div>}
          </div>
          <div className="border-t border-[var(--border)] px-4 py-3 text-[11px] text-[var(--muted-foreground)]">共 {types.data?.total ?? 0} 个类型</div>
        </aside>

        <section className={`${mobileView === "types" ? "hidden" : "flex"} min-w-0 flex-col bg-[var(--card)] lg:flex`}>
          {selectedType ? <>
            <div className="border-b border-[var(--border)]">
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold">{selectedType.name}</h2><StatusBadge active={selectedType.status === 1}>{selectedType.status === 1 ? "启用" : "停用"}</StatusBadge></div><code className="mt-1 block text-[10px] text-[var(--primary)]">{selectedType.type}</code>{selectedType.remark && <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{selectedType.remark}</p>}</div>
                <RowActions
                  primary={[
                    ...(canUpdate ? [{ label: "编辑类型", onClick: () => { setError(null); setTypeForm({ ...selectedType, remark: selectedType.remark ?? "" }); } }] : []),
                    ...(canCreate ? [{ label: "新增字典项", onClick: () => { setError(null); setDataForm({ dictType: selectedType.type, label: "", value: "", sort: 0, status: 1, remark: "" }); } }] : []),
                  ]}
                  more={canDelete ? [{ label: "删除类型", danger: true, onClick: () => setDeletingType(selectedType) }] : []}
                />
              </div>
              <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] bg-[var(--muted)]/45 px-4 py-2.5">
                <Field label="标签"><Input value={dataDraft.label} onChange={(event) => setDataDraft({ ...dataDraft, label: event.target.value })} placeholder="搜索显示标签" className="h-9 w-48 text-xs" /></Field>
                <Field label="状态"><Select value={dataDraft.status} onChange={(event) => setDataDraft({ ...dataDraft, status: event.target.value })} className="h-9 w-28 text-xs"><option value="">全部</option><option value="1">启用</option><option value="0">停用</option></Select></Field>
                <Button variant="ghost" size="sm" onClick={() => { const next = { label: "", status: "" }; setDataDraft(next); setDataFilters(next); setDataPage(1); }}>重置</Button>
                <Button variant="outline" size="sm" onClick={() => { setDataFilters({ ...dataDraft }); setDataPage(1); }}>查询</Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto"><DataTable columns={columns} rows={values.data?.list ?? []} rowKey={(row) => row.id} loading={values.isPending} error={values.error?.message} minWidth={760} /></div>
            <Pagination page={dataPage} pageSize={dataPageSize} total={values.data?.total ?? 0} loading={values.isFetching} onPageChange={setDataPage} onPageSizeChange={(size) => { setDataPageSize(size); setDataPage(1); }} />
          </> : <div className="flex flex-1 items-center justify-center p-10 text-center"><div><div className="text-sm font-semibold">请选择一个字典类型</div><p className="mt-2 text-xs text-[var(--muted-foreground)]">选择左侧类型后，在这里维护它的显示标签和持久值。</p></div></div>}
        </section>
      </div>
    </div>

    <Drawer open={Boolean(typeForm)} onClose={() => setTypeForm(null)} title={typeForm?.id ? "编辑字典类型" : "新增字典类型"} description="类型标识会被代码、缓存和字典项引用，创建后不可修改。" footer={<><Button variant="ghost" onClick={() => setTypeForm(null)}>取消</Button><Button type="submit" form="dict-type-form" disabled={saveType.isPending}>{saveType.isPending ? "保存中…" : "保存类型"}</Button></>}>
      {typeForm && <form id="dict-type-form" onSubmit={submitType} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        <Field label="字典名称"><Input value={typeForm.name} onChange={(event) => setTypeForm({ ...typeForm, name: event.target.value })} placeholder="例如 用户性别" /></Field>
        <Field label="类型标识"><Input value={typeForm.type} onChange={(event) => setTypeForm({ ...typeForm, type: event.target.value })} placeholder="例如 system_user_sex" disabled={Boolean(typeForm.id)} /></Field>
        <Field label="状态"><Select value={typeForm.status} onChange={(event) => setTypeForm({ ...typeForm, status: Number(event.target.value) })}><option value="1">启用</option><option value="0">停用</option></Select></Field>
        <Field label="说明"><Textarea value={typeForm.remark ?? ""} onChange={(event) => setTypeForm({ ...typeForm, remark: event.target.value })} placeholder="说明该字典的业务用途" /></Field>
      </form>}
    </Drawer>

    <Drawer open={Boolean(dataForm)} onClose={() => setDataForm(null)} title={dataForm?.id ? "编辑字典项" : "新增字典项"} description={selectedType ? `${selectedType.name} · ${selectedType.type}` : undefined} footer={<><Button variant="ghost" onClick={() => setDataForm(null)}>取消</Button><Button type="submit" form="dict-data-form" disabled={saveData.isPending}>{saveData.isPending ? "保存中…" : "保存字典项"}</Button></>}>
      {dataForm && <form id="dict-data-form" onSubmit={submitData} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        <Field label="所属类型"><Input value={dataForm.dictType} disabled /></Field>
        <Field label="显示标签"><Input value={dataForm.label} onChange={(event) => setDataForm({ ...dataForm, label: event.target.value })} placeholder="例如 启用" /></Field>
        <Field label="字典值"><Input value={dataForm.value} onChange={(event) => setDataForm({ ...dataForm, value: event.target.value })} placeholder="例如 1" /></Field>
        <Field label="显示排序"><Input type="number" min={0} max={9999} value={dataForm.sort} onChange={(event) => setDataForm({ ...dataForm, sort: Number(event.target.value) })} /></Field>
        <Field label="状态"><Select value={dataForm.status} onChange={(event) => setDataForm({ ...dataForm, status: Number(event.target.value) })}><option value="1">启用</option><option value="0">停用</option></Select></Field>
        <Field label="说明"><Textarea value={dataForm.remark ?? ""} onChange={(event) => setDataForm({ ...dataForm, remark: event.target.value })} placeholder="补充该选项的业务含义" /></Field>
      </form>}
    </Drawer>

    <ConfirmDialog open={Boolean(deletingType)} title="删除字典类型" description={`确定删除“${deletingType?.name ?? ""}”吗？存在字典项时服务端会拒绝删除。`} confirmLabel="确认删除" pending={deleteType.isPending} onCancel={() => setDeletingType(null)} onConfirm={() => deletingType && deleteType.mutate(deletingType)} />
    <ConfirmDialog open={Boolean(deletingData)} title="删除字典项" description={`确定删除“${deletingData?.label ?? ""}”吗？使用该值的历史业务数据不会被自动修改。`} confirmLabel="确认删除" pending={deleteData.isPending} onCancel={() => setDeletingData(null)} onConfirm={() => deletingData && deleteData.mutate(deletingData)} />
  </div>;
}
