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
import { useT } from "@neton/application-front-runtime/i18n";
import { useDescribeError } from "@neton/application-front-runtime/errors";

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
  const t = useT("system");
  const describeError = useDescribeError("system");
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
    onError: (cause: Error) => setError(describeError(cause)),
  });

  const saveData = useMutation({
    mutationFn: (form: DictDataForm) => apiWrite<void>(`/admin/system/dict-data/${form.id ? "update" : "create"}`, form.id ? "PUT" : "POST", { ...form, remark: form.remark || null }),
    onSuccess: async () => {
      setDataForm(null);
      await queryClient.invalidateQueries({ queryKey: ["system", "dict-data"] });
    },
    onError: (cause: Error) => setError(describeError(cause)),
  });

  const deleteType = useMutation({
    mutationFn: (row: DictType) => apiWrite<void>(`/admin/system/dict-type/delete/${row.id}`, "DELETE"),
    onSuccess: async (_, row) => {
      if (selectedType?.id === row.id) setSelectedType(null);
      setDeletingType(null);
      await queryClient.invalidateQueries({ queryKey: ["system", "dict-types"] });
    },
    onError: (cause: Error) => { setDeletingType(null); setError(describeError(cause)); },
  });

  const deleteData = useMutation({
    mutationFn: (row: DictData) => apiWrite<void>(`/admin/system/dict-data/delete/${row.id}`, "DELETE"),
    onSuccess: async () => {
      setDeletingData(null);
      await queryClient.invalidateQueries({ queryKey: ["system", "dict-data"] });
    },
    onError: (cause: Error) => { setDeletingData(null); setError(describeError(cause)); },
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
      setError(t("dict.error.typeRequired"));
      return;
    }
    setError(null);
    saveType.mutate({ ...typeForm, name: typeForm.name.trim(), type: typeForm.type.trim(), remark: typeForm.remark?.trim() });
  }

  function submitData(event: React.FormEvent) {
    event.preventDefault();
    if (!dataForm) return;
    if (!dataForm.label.trim() || !dataForm.value.trim()) {
      setError(t("dict.error.dataRequired"));
      return;
    }
    setError(null);
    saveData.mutate({ ...dataForm, label: dataForm.label.trim(), value: dataForm.value.trim(), remark: dataForm.remark?.trim() });
  }

  const columns: DataColumn<DictData>[] = [
    { key: "label", header: t("dict.field.label"), cell: (row) => <span className="font-medium">{row.label}</span> },
    { key: "value", header: t("dict.field.value"), cell: (row) => <code className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs text-[var(--primary)]">{row.value}</code> },
    { key: "sort", header: t("common.sort"), cell: (row) => row.sort },
    { key: "status", header: t("common.status"), cell: (row) => <StatusBadge active={row.status === 1}>{row.status === 1 ? t("common.enabled") : t("common.disabled")}</StatusBadge> },
    { key: "remark", header: t("common.remark"), cell: (row) => row.remark || <span className="text-[var(--muted-foreground)]">-</span> },
    {
      key: "actions", header: t("common.actions"), headerClassName: "text-right", className: "text-right",
      cell: (row) => <RowActions
        primary={canUpdate ? [{ label: t("common.edit"), kind: "edit" as const, onClick: () => { setError(null); setDataForm({ ...row, remark: row.remark ?? "" }); } }] : []}
        more={canDelete ? [{ label: t("common.delete"), kind: "delete" as const, danger: true, onClick: () => setDeletingData(row) }] : []}
      />,
    },
  ];

  return <div className="space-y-4">
    <PageHeader
      eyebrow={t("dict.eyebrow")}
      title={t("dict.title")}
      description={t("dict.description")}
      actions={<Button variant="outline" onClick={() => { types.refetch(); if (selectedType) values.refetch(); }}>{t("common.refresh")}</Button>}
    />

    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div>}

    <div className="front-surface overflow-hidden rounded-xl">
      <div className="flex border-b border-[var(--border)] p-2 lg:hidden">
        <button type="button" onClick={() => setMobileView("types")} className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${mobileView === "types" ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>{t("dict.types")}</button>
        <button type="button" onClick={() => setMobileView("data")} className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${mobileView === "data" ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>{t("dict.items")}</button>
      </div>

      <div className="grid min-h-[620px] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`${mobileView === "data" ? "hidden" : "flex"} min-w-0 flex-col border-r-0 border-[var(--border)] bg-[var(--muted)] lg:flex lg:border-r`}>
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-semibold">{t("dict.types")}</h2><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{t("dict.typesHint")}</p></div>
              {canCreate && <Button size="sm" onClick={() => { setError(null); setTypeForm({ ...emptyType }); }}>{t("dict.action.createType")}</Button>}
            </div>
            <form className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={(event) => { event.preventDefault(); setTypeSearch(typeSearchDraft.trim()); }}>
              <Input value={typeSearchDraft} onChange={(event) => setTypeSearchDraft(event.target.value)} placeholder={t("dict.placeholder.typeSearch")} className="h-9 min-w-0 bg-[var(--card)] text-xs" />
              <Button type="submit" variant="outline" size="sm" className="whitespace-nowrap px-3">{t("common.search")}</Button>
            </form>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {types.isPending ? <div className="p-4 text-xs text-[var(--muted-foreground)]">{t("dict.loadingTypes")}</div> : (types.data?.list ?? []).map((row) => {
              const active = selectedType?.id === row.id;
              return <div key={row.id} className={`rounded-lg border transition ${active ? "border-blue-300 bg-[var(--card)] shadow-[var(--shadow-xs)] dark:border-blue-800" : "border-transparent hover:border-[var(--border)] hover:bg-[var(--card)]"}`}>
                <button type="button" onClick={() => selectType(row)} className="w-full px-3 py-2.5 text-left">
                  <span className="flex items-center justify-between gap-2"><span className="min-w-0"><strong className="block truncate text-xs font-semibold">{row.name}</strong><code className="mt-0.5 block truncate text-[10px] text-[var(--muted-foreground)]">{row.type}</code></span><StatusBadge active={row.status === 1}>{row.status === 1 ? t("common.enabled") : t("common.disabled")}</StatusBadge></span>
                </button>
              </div>;
            })}
            {!types.isPending && (types.data?.list.length ?? 0) === 0 && <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">{t("dict.noTypes")}</div>}
          </div>
          <div className="border-t border-[var(--border)] px-4 py-3 text-[11px] text-[var(--muted-foreground)]">{t("dict.typeCount", { count: types.data?.total ?? 0 })}</div>
        </aside>

        <section className={`${mobileView === "types" ? "hidden" : "flex"} min-w-0 flex-col bg-[var(--card)] lg:flex`}>
          {selectedType ? <>
            <div className="border-b border-[var(--border)]">
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold">{selectedType.name}</h2><StatusBadge active={selectedType.status === 1}>{selectedType.status === 1 ? t("common.enabled") : t("common.disabled")}</StatusBadge></div><code className="mt-1 block text-[10px] text-[var(--primary)]">{selectedType.type}</code>{selectedType.remark && <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{selectedType.remark}</p>}</div>
                <RowActions
                  primary={[
                    ...(canUpdate ? [{ label: t("dict.action.editType"), kind: "edit" as const, onClick: () => { setError(null); setTypeForm({ ...selectedType, remark: selectedType.remark ?? "" }); } }] : []),
                    ...(canCreate ? [{ label: t("dict.action.createItem"), kind: "create" as const, onClick: () => { setError(null); setDataForm({ dictType: selectedType.type, label: "", value: "", sort: 0, status: 1, remark: "" }); } }] : []),
                  ]}
                  more={canDelete ? [{ label: t("dict.action.deleteType"), kind: "delete" as const, danger: true, onClick: () => setDeletingType(selectedType) }] : []}
                />
              </div>
              <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] bg-[var(--muted)]/45 px-4 py-2.5">
                <Field label={t("dict.filter.label")}><Input value={dataDraft.label} onChange={(event) => setDataDraft({ ...dataDraft, label: event.target.value })} placeholder={t("dict.placeholder.labelSearch")} className="h-9 w-48 text-xs" /></Field>
                <Field label={t("common.status")}><Select value={dataDraft.status} onChange={(event) => setDataDraft({ ...dataDraft, status: event.target.value })} className="h-9 w-28 text-xs"><option value="">{t("common.all")}</option><option value="1">{t("common.enabled")}</option><option value="0">{t("common.disabled")}</option></Select></Field>
                <Button variant="ghost" size="sm" onClick={() => { const next = { label: "", status: "" }; setDataDraft(next); setDataFilters(next); setDataPage(1); }}>{t("common.reset")}</Button>
                <Button variant="outline" size="sm" onClick={() => { setDataFilters({ ...dataDraft }); setDataPage(1); }}>{t("common.search")}</Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto"><DataTable columns={columns} rows={values.data?.list ?? []} rowKey={(row) => row.id} loading={values.isPending} error={values.error ? describeError(values.error) : null} minWidth={760} /></div>
            <Pagination page={dataPage} pageSize={dataPageSize} total={values.data?.total ?? 0} loading={values.isFetching} onPageChange={setDataPage} onPageSizeChange={(size) => { setDataPageSize(size); setDataPage(1); }} />
          </> : <div className="flex flex-1 items-center justify-center p-10 text-center"><div><div className="text-sm font-semibold">{t("dict.empty.title")}</div><p className="mt-2 text-xs text-[var(--muted-foreground)]">{t("dict.empty.description")}</p></div></div>}
        </section>
      </div>
    </div>

    <Drawer open={Boolean(typeForm)} onClose={() => setTypeForm(null)} title={typeForm?.id ? t("dict.typeForm.editTitle") : t("dict.typeForm.createTitle")} description={t("dict.typeForm.description")} footer={<><Button variant="ghost" onClick={() => setTypeForm(null)}>{t("common.cancel")}</Button><Button type="submit" form="dict-type-form" disabled={saveType.isPending}>{saveType.isPending ? t("common.saving") : t("dict.action.saveType")}</Button></>}>
      {typeForm && <form id="dict-type-form" onSubmit={submitType} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        <Field label={t("dict.field.typeName")}><Input value={typeForm.name} onChange={(event) => setTypeForm({ ...typeForm, name: event.target.value })} placeholder={t("dict.placeholder.typeName")} /></Field>
        <Field label={t("dict.field.typeKey")}><Input value={typeForm.type} onChange={(event) => setTypeForm({ ...typeForm, type: event.target.value })} placeholder={t("dict.placeholder.typeKey")} disabled={Boolean(typeForm.id)} /></Field>
        <Field label={t("common.status")}><Select value={typeForm.status} onChange={(event) => setTypeForm({ ...typeForm, status: Number(event.target.value) })}><option value="1">{t("common.enabled")}</option><option value="0">{t("common.disabled")}</option></Select></Field>
        <Field label={t("common.remark")}><Textarea value={typeForm.remark ?? ""} onChange={(event) => setTypeForm({ ...typeForm, remark: event.target.value })} placeholder={t("dict.placeholder.typeRemark")} /></Field>
      </form>}
    </Drawer>

    <Drawer open={Boolean(dataForm)} onClose={() => setDataForm(null)} title={dataForm?.id ? t("dict.dataForm.editTitle") : t("dict.action.createItem")} description={selectedType ? `${selectedType.name} · ${selectedType.type}` : undefined} footer={<><Button variant="ghost" onClick={() => setDataForm(null)}>{t("common.cancel")}</Button><Button type="submit" form="dict-data-form" disabled={saveData.isPending}>{saveData.isPending ? t("common.saving") : t("dict.action.saveItem")}</Button></>}>
      {dataForm && <form id="dict-data-form" onSubmit={submitData} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        <Field label={t("dict.field.dictType")}><Input value={dataForm.dictType} disabled /></Field>
        <Field label={t("dict.field.label")}><Input value={dataForm.label} onChange={(event) => setDataForm({ ...dataForm, label: event.target.value })} placeholder={t("dict.placeholder.label")} /></Field>
        <Field label={t("dict.field.value")}><Input value={dataForm.value} onChange={(event) => setDataForm({ ...dataForm, value: event.target.value })} placeholder={t("dict.placeholder.value")} /></Field>
        <Field label={t("dict.field.sort")}><Input type="number" min={0} max={9999} value={dataForm.sort} onChange={(event) => setDataForm({ ...dataForm, sort: Number(event.target.value) })} /></Field>
        <Field label={t("common.status")}><Select value={dataForm.status} onChange={(event) => setDataForm({ ...dataForm, status: Number(event.target.value) })}><option value="1">{t("common.enabled")}</option><option value="0">{t("common.disabled")}</option></Select></Field>
        <Field label={t("common.remark")}><Textarea value={dataForm.remark ?? ""} onChange={(event) => setDataForm({ ...dataForm, remark: event.target.value })} placeholder={t("dict.placeholder.dataRemark")} /></Field>
      </form>}
    </Drawer>

    <ConfirmDialog open={Boolean(deletingType)} title={t("dict.confirm.deleteTypeTitle")} description={t("dict.confirm.deleteTypeBody", { name: deletingType?.name ?? "" })} confirmLabel={t("common.confirmDelete")} pending={deleteType.isPending} onCancel={() => setDeletingType(null)} onConfirm={() => deletingType && deleteType.mutate(deletingType)} />
    <ConfirmDialog open={Boolean(deletingData)} title={t("dict.confirm.deleteItemTitle")} description={t("dict.confirm.deleteItemBody", { name: deletingData?.label ?? "" })} confirmLabel={t("common.confirmDelete")} pending={deleteData.isPending} onCancel={() => setDeletingData(null)} onConfirm={() => deletingData && deleteData.mutate(deletingData)} />
  </div>;
}
