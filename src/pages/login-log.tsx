"use client";
import { ResourcePage } from "@neton/application-front-resource";
export default function Page() { return <ResourcePage config={{
  resourceKey: "system-login-log", eyebrow: "AUDIT", title: "登录日志", description: "审计后台登录结果、来源地址与客户端信息。", endpoint: "/system/login-log", readOnly: true,
  detailFields: [{ key: "id", label: "编号", format: "mono" }, { key: "userId", label: "用户 ID", format: "mono" }, { key: "username", label: "用户名" }, { key: "userIp", label: "IP 地址", format: "mono" }, { key: "userAgent", label: "客户端" }, { key: "loginResult", label: "登录结果" }, { key: "createdAt", label: "登录时间", format: "date" }],
  permissions: { page: "system:login-log:page" },
  fields: [
    { key: "id", label: "编号", format: "mono" }, { key: "username", label: "用户名" }, { key: "userIp", label: "IP 地址", format: "mono" },
    { key: "loginResult", label: "结果" }, { key: "userAgent", label: "客户端" }, { key: "createdAt", label: "时间", format: "date" },
    { key: "username", label: "用户名", filter: true, table: false }, { key: "userIp", label: "IP 地址", filter: true, table: false },
    { key: "loginResult", label: "登录结果", filter: true, table: false, type: "select", options: [{ label: "成功", value: 0 }, { label: "失败", value: 1 }] },
  ],
}} />; }
