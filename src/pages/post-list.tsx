"use client";
import { ResourcePage } from "@neton/application-front-resource";
export default function Page() { return <ResourcePage config={{
  resourceKey: "system-post", eyebrow: "ORGANIZATION", title: "岗位管理", description: "维护组织岗位编码、排序与可用状态。", endpoint: "/system/post",
  permissions: { page: "system:post:page", create: "system:post:create", update: "system:post:update", delete: "system:post:delete" },
  fields: [
    { key: "name", label: "岗位名称", required: true }, { key: "code", label: "岗位编码", required: true, format: "mono" },
    { key: "sort", label: "排序", type: "number", defaultValue: 0 }, { key: "status", label: "状态", type: "select", defaultValue: 1, format: "status", options: [{ label: "启用", value: 1 }, { label: "停用", value: 0 }] },
    { key: "name", label: "岗位名称", filter: true, table: false }, { key: "code", label: "岗位编码", filter: true, table: false },
  ],
}} />; }
