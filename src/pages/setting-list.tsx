"use client";

import * as React from "react";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import {
  Alert, Button, DataTable, Drawer, Field, FilterPanel, Input,
  PageHeader, Select, StatusBadge, type DataColumn,
} from "@neton/application-front-kit";

interface SettingItem {
  category: string;
  key: string;
  value: string;
  valueType: number;
  name: string;
  description: string;
  defaultValue: string;
  isDefault: boolean;
}

// 与后端 SettingValueType 的序号对齐
const VALUE_TYPE: Record<number, string> = {
  0: "文本", 1: "整数", 2: "长整数", 3: "布尔", 4: "定点数", 5: "JSON",
};

/**
 * 系统设置（SYSTEM_CONFIG_SPEC）。
 *
 * 列表以**代码里的定义**为准，不是库里的行——所以没有新增和删除：设置项由代码声明，
 * 后台只能改值。库里若混进一个没有定义的 key，等于没人知道它做什么，
 * 这里也就不该提供制造它的入口。
 */
export default function SystemSettingListPage() {
  const [rows, setRows] = React.useState<SettingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [editing, setEditing] = React.useState<SettingItem | null>(null);
  const [draft, setDraft] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    apiFetch<SettingItem[]>(`/admin/system/setting/list${qs}`)
      .then((d) => { setRows(d); setError(null); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category]);
  React.useEffect(load, [load]);

  async function save() {
    if (!editing) return;
    setPending(true);
    try {
      // 后端按定义校验，越界/类型不符会被拒——错误停在这里，
      // 好过写进库之后读取时静默退回默认值
      await apiWrite("/admin/system/setting/update", "POST", { key: editing.key, value: draft.trim() });
      setEditing(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function sync() {
    setPending(true);
    try {
      const created = await apiWrite<number>("/admin/system/setting/sync", "POST");
      setError(created > 0 ? null : null);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  const categories = React.useMemo(
    () => [...new Set(rows.map((r) => r.category))].sort(),
    [rows],
  );

  const columns: DataColumn<SettingItem>[] = [
    { key: "category", header: "模块", cell: (r) => r.category },
    { key: "name", header: "设置项", cell: (r) => (
        <div>
          <div>{r.name}</div>
          <code className="text-[11px] text-[var(--muted-foreground)]">{r.key}</code>
        </div>
      ) },
    { key: "value", header: "当前值", cell: (r) => (
        <div className="flex items-center gap-2">
          <code className="text-xs">{r.value}</code>
          {/* 区分「没改过」和「改过」，运营排查时第一眼要看的就是这个 */}
          {!r.isDefault && <StatusBadge active>已修改</StatusBadge>}
        </div>
      ) },
    { key: "valueType", header: "类型", cell: (r) => VALUE_TYPE[r.valueType] ?? r.valueType },
    { key: "defaultValue", header: "默认值", cell: (r) => <code className="text-xs">{r.defaultValue}</code> },
    { key: "description", header: "说明", cell: (r) => (
        <span className="text-xs text-[var(--muted-foreground)]">{r.description}</span>
      ) },
    { key: "ops", header: "", className: "text-right", cell: (r) => (
        <Button variant="outline" onClick={() => { setEditing(r); setDraft(r.value); }}>修改</Button>
      ) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="系统管理"
        title="系统设置"
        description="设置项由代码声明，后台只改值；改错会被按定义拒绝"
        actions={<Button variant="outline" onClick={sync} disabled={pending}>同步缺失项</Button>}
      />
      {error && <Alert tone="error">{error}</Alert>}

      <FilterPanel onSubmit={(e) => { e.preventDefault(); setCategory(categoryQuery); }}>
        <Field label="所属模块">
          <Select value={categoryQuery} onChange={(e) => setCategoryQuery(e.target.value)}>
            <option value="">全部</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Button type="submit">查询</Button>
      </FilterPanel>

      <div className="front-surface overflow-hidden rounded-xl">
        <DataTable columns={columns} rows={rows} loading={loading} rowKey={(r) => r.key} />
      </div>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.name ?? ""}
        description={editing?.description}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "保存中…" : "保存"}
            </Button>
          </>
        }
      >
        <Field label="设置 key">
          <code className="text-xs">{editing?.key}</code>
        </Field>
        <Field label={`值（${editing ? VALUE_TYPE[editing.valueType] ?? "" : ""}）`}>
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
        <Field label="默认值">
          <div className="flex items-center gap-2">
            <code className="text-xs">{editing?.defaultValue}</code>
            {editing && draft !== editing.defaultValue && (
              <Button variant="outline" onClick={() => setDraft(editing.defaultValue)}>恢复默认</Button>
            )}
          </div>
        </Field>
      </Drawer>
    </div>
  );
}
