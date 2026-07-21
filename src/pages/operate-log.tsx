"use client";
import { ResourcePage } from "@neton/application-front-resource";
export default function Page() { return <ResourcePage config={{
  resourceKey: "system-operate-log", eyebrow: "AUDIT", title: "操作日志", description: "按模块和操作者追踪后台关键操作。", endpoint: "/system/operate-log", readOnly: true,
  detailFields: [{ key: "id", label: "编号", format: "mono" }, { key: "userId", label: "用户 ID", format: "mono" }, { key: "module", label: "模块" }, { key: "name", label: "操作" }, { key: "operateType", label: "操作类型" }, { key: "requestMethod", label: "请求方法", format: "mono" }, { key: "requestUrl", label: "请求地址" }, { key: "requestParams", label: "请求参数" }, { key: "responseResult", label: "响应结果" }, { key: "userIp", label: "IP 地址", format: "mono" }, { key: "duration", label: "耗时(ms)" }, { key: "resultCode", label: "结果码" }, { key: "createdAt", label: "操作时间", format: "date" }],
  permissions: { page: "system:operate-log:page" },
  fields: [
    { key: "id", label: "编号", format: "mono" }, { key: "module", label: "模块" }, { key: "name", label: "操作" }, { key: "userId", label: "用户 ID", format: "mono" },
    { key: "requestMethod", label: "方法", format: "mono" }, { key: "requestUrl", label: "请求地址" }, { key: "userIp", label: "IP" }, { key: "createdAt", label: "时间", format: "date" },
    { key: "module", label: "模块", filter: true, table: false }, { key: "userId", label: "用户 ID", filter: true, table: false },
  ],
}} />; }
