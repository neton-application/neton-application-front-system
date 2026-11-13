"use client";
import { ResourcePage } from "@neton/application-front-resource";
import { useT } from "@neton/application-front-runtime/i18n";
export default function Page() {
  const t = useT("system");
  return <ResourcePage config={{
  resourceKey: "system-operate-log", errorNamespace: "system", eyebrow: t("common.eyebrow.audit"), title: t("operateLog.title"), description: t("operateLog.description"), endpoint: "/system/operate-log", readOnly: true,
  detailFields: [
    { key: "id", label: t("common.id"), format: "mono" },
    { key: "userId", label: t("common.userId"), format: "mono" },
    { key: "module", label: t("common.module") },
    { key: "name", label: t("operateLog.field.operation") },
    { key: "recordKind", label: t("operateLog.field.recordKind") },
    { key: "outcome", label: t("operateLog.field.outcome") },
    { key: "highRisk", label: t("operateLog.field.highRisk"), format: "status", options: [
      { value: 0, label: t("operateLog.risk.normal") }, { value: 1, label: t("operateLog.risk.high") },
    ] },
    { key: "invocationId", label: t("operateLog.field.invocationId"), format: "mono" },
    { key: "targetId", label: t("operateLog.field.targetId"), format: "mono" },
    { key: "requestMethod", label: t("operateLog.field.requestMethod"), format: "mono" },
    { key: "requestUrl", label: t("operateLog.field.requestUrl") },
    { key: "userIp", label: t("common.ipAddress"), format: "mono" },
    { key: "duration", label: t("operateLog.field.duration") },
    { key: "httpStatus", label: t("operateLog.field.httpStatus") },
    { key: "resultCode", label: t("operateLog.field.resultCode") },
    { key: "createdAt", label: t("operateLog.field.operateTime"), format: "date" },
  ],
  permissions: { page: "system:operate-log:query" },
  fields: [
    { key: "id", label: t("common.id"), format: "mono" }, { key: "module", label: t("common.module") }, { key: "name", label: t("operateLog.field.operation") }, { key: "userId", label: t("common.userId"), format: "mono" },
    { key: "requestMethod", label: t("operateLog.field.method"), format: "mono" }, { key: "requestUrl", label: t("operateLog.field.requestUrl") }, { key: "userIp", label: t("operateLog.field.ip") }, { key: "createdAt", label: t("common.time"), format: "date" },
    { key: "recordKind", label: t("operateLog.field.recordKind") },
    { key: "outcome", label: t("operateLog.field.outcome") },
    { key: "module", label: t("common.module"), filter: true, table: false }, { key: "userId", label: t("common.userId"), filter: true, table: false },
  ],
}} />; }
