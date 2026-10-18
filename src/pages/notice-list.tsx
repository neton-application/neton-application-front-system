"use client";
import { ResourcePage } from "@neton/application-front-resource";
import { useT } from "@neton/application-front-runtime/i18n";
export default function Page() {
  const t = useT("system");
  const status = [{ label: t("common.enabled"), value: 1 }, { label: t("common.disabled"), value: 0 }];
  return <ResourcePage config={{
  resourceKey: "system-notice", errorNamespace: "system", eyebrow: t("notice.eyebrow"), title: t("notice.title"), description: t("notice.description"), endpoint: "/system/notice",
  permissions: { page: "system:notice:query", create: "system:notice:create", update: "system:notice:update", delete: "system:notice:delete" },
  fields: [
    { key: "title", label: t("common.title"), required: true }, { key: "type", label: t("common.type"), type: "select", defaultValue: 0, options: [{ label: t("notice.type.notification"), value: 0 }, { label: t("notice.type.announcement"), value: 1 }] },
    { key: "status", label: t("common.status"), type: "select", defaultValue: 1, format: "status", options: status },
    { key: "content", label: t("common.content"), type: "textarea", required: true, table: false }, { key: "createdAt", label: t("common.createdAt"), format: "date", table: true },
    { key: "title", label: t("common.title"), filter: true, table: false },
  ],
}} />; }
