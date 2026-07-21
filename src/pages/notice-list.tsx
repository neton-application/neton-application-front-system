"use client";
import { ResourcePage } from "@neton/application-front-resource";
export default function Page() { return <ResourcePage config={{
  resourceKey: "system-notice", eyebrow: "COMMUNICATION", title: "通知公告", description: "集中维护后台公告内容；v1 不伪造后端尚未提供的推送动作。", endpoint: "/system/notice",
  permissions: { page: "system:notice:page", create: "system:notice:create", update: "system:notice:update", delete: "system:notice:delete" },
  fields: [
    { key: "title", label: "标题", required: true }, { key: "type", label: "类型", type: "select", defaultValue: 0, options: [{ label: "通知", value: 0 }, { label: "公告", value: 1 }] },
    { key: "status", label: "状态", type: "select", defaultValue: 1, format: "status", options: [{ label: "启用", value: 1 }, { label: "停用", value: 0 }] },
    { key: "content", label: "内容", type: "textarea", required: true, table: false }, { key: "createdAt", label: "创建时间", format: "date", table: true },
    { key: "title", label: "标题", filter: true, table: false },
  ],
}} />; }
