"use client";
import { ResourcePage } from "@neton/application-front-resource";
import { useT } from "@neton/application-front-runtime/i18n";
export default function Page() {
  const t = useT("system");
  return <ResourcePage config={{
  resourceKey: "system-login-log", errorNamespace: "system", eyebrow: t("common.eyebrow.audit"), title: t("loginLog.title"), description: t("loginLog.description"), endpoint: "/system/login-log", readOnly: true,
  detailFields: [{ key: "id", label: t("common.id"), format: "mono" }, { key: "userId", label: t("common.userId"), format: "mono" }, { key: "username", label: t("common.username") }, { key: "userIp", label: t("common.ipAddress"), format: "mono" }, { key: "userAgent", label: t("loginLog.field.userAgent") }, { key: "loginResult", label: t("loginLog.field.loginResult") }, { key: "createdAt", label: t("loginLog.field.loginTime"), format: "date" }],
  permissions: { page: "system:login-log:query" },
  fields: [
    { key: "id", label: t("common.id"), format: "mono" }, { key: "username", label: t("common.username") }, { key: "userIp", label: t("common.ipAddress"), format: "mono" },
    { key: "loginResult", label: t("loginLog.field.result") }, { key: "userAgent", label: t("loginLog.field.userAgent") }, { key: "createdAt", label: t("common.time"), format: "date" },
    { key: "username", label: t("common.username"), filter: true, table: false }, { key: "userIp", label: t("common.ipAddress"), filter: true, table: false },
    { key: "loginResult", label: t("loginLog.field.loginResult"), filter: true, table: false, type: "select", options: [{ label: t("loginLog.result.success"), value: 0 }, { label: t("loginLog.result.failure"), value: 1 }] },
  ],
}} />; }
