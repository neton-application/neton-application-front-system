"use client";
import { ResourcePage } from "@neton/application-front-resource";
import { useT } from "@neton/application-front-runtime/i18n";
export default function Page() {
  const t = useT("system");
  return <ResourcePage config={{
  resourceKey: "system-post", errorNamespace: "system", eyebrow: t("common.eyebrow.organization"), title: t("post.title"), description: t("post.description"), endpoint: "/system/post",
  permissions: { page: "system:post:query", create: "system:post:create", update: "system:post:update", delete: "system:post:delete" },
  fields: [
    { key: "name", label: t("post.field.name"), required: true }, { key: "code", label: t("post.field.code"), required: true, format: "mono" },
    { key: "sort", label: t("common.sort"), type: "number", defaultValue: 0 }, { key: "status", label: t("common.status"), type: "select", defaultValue: 1, format: "status", options: [{ label: t("common.enabled"), value: 1 }, { label: t("common.disabled"), value: 0 }] },
    { key: "name", label: t("post.field.name"), filter: true, table: false }, { key: "code", label: t("post.field.code"), filter: true, table: false },
  ],
}} />; }
