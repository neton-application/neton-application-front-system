"use client";
import * as React from "react";
import { ResourcePage, type ResourcePageConfig, type ResourceRecord } from "@neton/application-front-resource";
import { apiWrite } from "@neton/application-front-runtime/client";
import { useMutation, usePermission, useQueryClient } from "@neton/application-front-runtime/client-context";
import { useT, type Translate } from "@neton/application-front-runtime/i18n";
import { useDescribeError } from "@neton/application-front-runtime/errors";
import { Alert, Button, Drawer, Field, Input, Textarea } from "@neton/application-front-kit";
type MessageConfigKey = "mailAccount" | "mailTemplate" | "mailLog" | "smsChannel" | "smsTemplate" | "smsLog" | "notifyTemplate" | "notifyMessage" | "notifyMy" | "socialUser";
function buildConfigs(t:Translate):Record<MessageConfigKey,ResourcePageConfig>{
const status=[{label:t("common.enabled"),value:1},{label:t("common.disabled"),value:0}];
const onOff=[{label:t("message.option.on"),value:1},{label:t("message.option.off"),value:0}];
const common=(endpoint:string,key:string,title:string,description:string,fields:ResourcePageConfig["fields"],readOnly=false,listPath="page"):ResourcePageConfig=>({resourceKey:key,eyebrow:t("message.eyebrow"),title,description,endpoint,listPath,readOnly,permissions:{page:`system:${key}:query`,query:`system:${key}:query`,create:`system:${key}:create`,update:`system:${key}:update`,delete:`system:${key}:delete`},fields});
function templateFields(){return [{key:"name",label:t("message.field.templateName"),required:true},{key:"code",label:t("message.field.templateCode"),required:true,format:"mono" as const},{key:"content",label:t("common.content"),type:"textarea" as const,required:true},{key:"channelId",label:t("message.field.channelId"),type:"number" as const,required:true},{key:"type",label:t("common.type"),type:"number" as const,defaultValue:0},{key:"status",label:t("common.status"),type:"select" as const,defaultValue:1,format:"status" as const,options:status},{key:"params",label:t("message.field.params"),type:"textarea" as const,table:false},{key:"remark",label:t("common.remark"),type:"textarea" as const,table:false},{key:"createdAt",label:t("common.createdAt"),format:"date" as const},{key:"name",label:t("common.name"),filter:true,table:false},{key:"code",label:t("common.code"),filter:true,table:false}];}
function channelFields(type:string){return [{key:"name",label:t("message.field.channelName"),required:true},{key:"code",label:t("message.field.channelCode"),required:true,format:"mono" as const},{key:"type",label:t("message.field.channelType"),defaultValue:type},{key:"config",label:t("message.field.channelConfig"),type:"textarea" as const,table:false},{key:"status",label:t("common.status"),type:"select" as const,defaultValue:1,format:"status" as const,options:status},{key:"remark",label:t("common.remark"),type:"textarea" as const,table:false},{key:"createdAt",label:t("common.createdAt"),format:"date" as const},{key:"name",label:t("common.name"),filter:true,table:false},{key:"status",label:t("common.status"),filter:true,table:false,type:"select" as const,options:status}];}
function logFields(){return [{key:"id",label:t("message.field.recordId"),format:"mono" as const},{key:"receiver",label:t("message.field.receiver")},{key:"templateCode",label:t("message.field.templateCode"),format:"mono" as const},{key:"sendStatus",label:t("message.field.sendStatus")},{key:"errorMessage",label:t("message.field.errorMessage")},{key:"sendTime",label:t("message.field.sendTime"),format:"date" as const},{key:"receiver",label:t("message.field.receiver"),filter:true,table:false},{key:"sendStatus",label:t("message.field.sendStatus"),filter:true,table:false}];}
function notifyFields(){return [{key:"id",label:t("message.field.notifyId"),format:"mono" as const},{key:"userId",label:t("message.field.userUid"),format:"mono" as const},{key:"templateCode",label:t("message.field.templateCode"),format:"mono" as const},{key:"templateContent",label:t("common.content")},{key:"readStatus",label:t("message.field.readStatus")},{key:"createdAt",label:t("common.createdAt"),format:"date" as const},{key:"userId",label:t("message.field.userUid"),filter:true,table:false},{key:"readStatus",label:t("message.field.readStatus"),filter:true,table:false}];}
return {
 mailAccount:{...common("/system/mail-account","mail-account",t("mailAccount.title"),t("mailAccount.description"),[{key:"mail",label:t("mailAccount.field.mail"),required:true},{key:"fromName",label:t("mailAccount.field.fromName")},{key:"vendor",label:t("mailAccount.field.vendor"),type:"select",defaultValue:"smtp",options:[{label:"SMTP",value:"smtp"},{label:"Resend",value:"resend"},{label:"SendGrid",value:"sendgrid"},{label:"Mailgun",value:"mailgun"},{label:"Brevo",value:"brevo"},{label:t("mailAccount.vendor.http"),value:"http"}]},{key:"apiKey",label:t("mailAccount.field.apiKey"),table:false},{key:"endpoint",label:t("mailAccount.field.endpoint"),table:false,placeholder:t("mailAccount.placeholder.endpoint")},{key:"username",label:t("mailAccount.field.smtpUsername"),table:false},{key:"password",label:t("mailAccount.field.smtpPassword"),table:false},{key:"host",label:t("mailAccount.field.smtpHost"),table:false},{key:"port",label:t("mailAccount.field.smtpPort"),type:"number",defaultValue:465,table:false,placeholder:t("mailAccount.placeholder.port")},{key:"sslEnable",label:t("mailAccount.field.ssl"),type:"select",defaultValue:1,options:onOff,table:false},{key:"starttlsEnable",label:t("mailAccount.field.starttls"),type:"select",defaultValue:0,options:onOff,table:false},{key:"status",label:t("common.status"),type:"select",defaultValue:1,format:"status",options:status},{key:"remark",label:t("common.remark"),type:"textarea",table:false},{key:"createTime",label:t("common.createdAt"),format:"date"},{key:"mail",label:t("common.email"),filter:true,table:false},{key:"status",label:t("common.status"),filter:true,table:false,type:"select",options:status}]),mapSave:(record:ResourceRecord)=>({...record,sslEnable:Boolean(Number(record.sslEnable)),starttlsEnable:Boolean(Number(record.starttlsEnable))})},
 mailTemplate:common("/system/mail-template","mail-template",t("mailTemplate.title"),t("mailTemplate.description"),templateFields()),
 mailLog:common("/system/mail-log","mail-log",t("mailLog.title"),t("mailLog.description"),logFields(),true),
 smsChannel:common("/system/sms-channel","sms-channel",t("smsChannel.title"),t("smsChannel.description"),channelFields("sms")),
 smsTemplate:common("/system/sms-template","sms-template",t("smsTemplate.title"),t("smsTemplate.description"),templateFields()),
 smsLog:common("/system/sms-log","sms-log",t("smsLog.title"),t("smsLog.description"),logFields(),true),
 notifyTemplate:common("/system/notify-template","notify-template",t("notifyTemplate.title"),t("notifyTemplate.description"),[{key:"name",label:t("message.field.templateName"),required:true},{key:"code",label:t("message.field.templateCode"),required:true,format:"mono"},{key:"type",label:t("common.type"),type:"number",defaultValue:0},{key:"messageTemplateId",label:t("notifyTemplate.field.messageTemplateId"),type:"number",required:true},{key:"params",label:t("message.field.params"),type:"textarea",table:false},{key:"status",label:t("common.status"),type:"select",defaultValue:1,format:"status",options:status},{key:"remark",label:t("common.remark"),type:"textarea",table:false},{key:"createdAt",label:t("common.createdAt"),format:"date"},{key:"name",label:t("common.name"),filter:true,table:false},{key:"code",label:t("common.code"),filter:true,table:false}]),
 notifyMessage:common("/system/notify-message","notify-message",t("notifyMessage.title"),t("notifyMessage.description"),notifyFields(),true),
 notifyMy:common("/system/notify-message","notify-message",t("notifyMy.title"),t("notifyMy.description"),notifyFields(),true,"my-page"),
 socialUser:common("/system/social-user","social-user",t("socialUser.title"),t("socialUser.description"),[{key:"id",label:t("message.field.recordId"),format:"mono"},{key:"socialType",label:t("socialUser.field.socialType")},{key:"openId",label:"Open ID",format:"mono"},{key:"nickname",label:t("socialUser.field.nickname")},{key:"createdAt",label:t("socialUser.field.boundAt"),format:"date"}],true,"list")
};
}
/** 组件内取通信中心各页面的配置（文案随当前语言）。 */
function useMessageConfigs(){const t=useT("system");return React.useMemo(()=>buildConfigs(t),[t]);}
export function MessageResourcePage({config}:{config:MessageConfigKey}){const configs=useMessageConfigs();return <ResourcePage config={configs[config]}/>}

/** 前端自己的表单校验错误：文案已经翻译好，直接显示，不走 describeError。 */
class FormValidationError extends Error {}

type MessageActionKind = "mail" | "sms" | "notify" | "channel";
type ActionTarget = { kind: MessageActionKind; record: ResourceRecord };

function parseList(value: string): string[] {
  return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function parseParams(value: string): Record<string, string> {
  return Object.fromEntries(value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const separator = line.indexOf("=");
    return separator < 0 ? [line, ""] : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  }));
}

export function ActionMessageResourcePage({ config: configKey, kind }: { config: MessageConfigKey; kind: MessageActionKind }) {
  const t = useT("system");
  const describeError = useDescribeError();
  const config = useMessageConfigs()[configKey];
  const queryClient = useQueryClient();
  const canUpdate = usePermission(config.permissions.update);
  const [target, setTarget] = React.useState<ActionTarget | null>(null);
  const [receiver, setReceiver] = React.useState("");
  const [cc, setCc] = React.useState("");
  const [bcc, setBcc] = React.useState("");
  const [content, setContent] = React.useState("");
  const [params, setParams] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const send = useMutation({
    mutationFn: async () => {
      if (!target || !receiver.trim()) throw new FormValidationError(kind === "mail" ? t("message.send.error.mailRequired") : t("message.send.error.receiverRequired"));
      const code = String(target.record.code ?? "");
      if (kind === "channel") {
        if (!content.trim()) throw new FormValidationError(t("message.send.error.contentRequired"));
        return apiWrite<boolean>(`/admin${config.endpoint}/send-test`, "POST", { channelId: target.record.id, receiver: receiver.trim(), content: content.trim() });
      }
      if (kind === "mail") {
        return apiWrite<boolean>(`/admin${config.endpoint}/send-mail`, "POST", { templateCode: code, toMails: parseList(receiver), ccMails: parseList(cc), bccMails: parseList(bcc), templateParams: parseParams(params) });
      }
      return apiWrite<boolean>(`/admin${config.endpoint}/${kind === "sms" ? "send-sms" : "send-notify"}`, "POST", { templateCode: code, receiver: receiver.trim(), params: parseParams(params) });
    },
    onSuccess: async () => {
      setTarget(null); setReceiver(""); setCc(""); setBcc(""); setContent(""); setParams(""); setError(null);
      await queryClient.invalidateQueries({ queryKey: [config.resourceKey] });
    },
    onError: (cause: Error) => setError(cause instanceof FormValidationError ? cause.message : describeError(cause)),
  });

  const enhanced: ResourcePageConfig = {
    ...config,
    rowActions: (record) => {
      const existing = config.rowActions?.(record) ?? {};
      return {
        primary: existing.primary,
        more: [
          ...(canUpdate ? [{ label: kind === "channel" ? t("message.action.testSend") : t("message.action.send"), tone: "primary" as const, onClick: () => { setError(null); setTarget({ kind, record }); } }] : []),
          ...(existing.more ?? []),
        ],
      };
    },
  };

  return <>
    <ResourcePage config={enhanced} />
    <Drawer open={Boolean(target)} onClose={() => setTarget(null)} title={kind === "channel" ? t("message.action.testSend") : t("message.send.title", { title: config.title })} description={kind === "channel" ? String(target?.record.name ?? "") : t("message.send.templateLabel", { code: String(target?.record.code ?? "-") })} footer={<><Button variant="ghost" onClick={() => setTarget(null)}>{t("common.cancel")}</Button><Button onClick={() => send.mutate()} disabled={send.isPending}>{send.isPending ? t("message.send.pending") : t("message.send.confirm")}</Button></>}>
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label={kind === "mail" ? t("message.send.field.toMails") : t("message.field.receiver")}><Input value={receiver} onChange={(event) => setReceiver(event.target.value)} placeholder={kind === "mail" ? t("message.send.placeholder.toMails") : t("message.send.placeholder.receiver")} /></Field>
        {kind === "mail" && <><Field label={t("message.send.field.cc")}><Input value={cc} onChange={(event) => setCc(event.target.value)} placeholder={t("message.send.placeholder.ccMails")} /></Field><Field label={t("message.send.field.bcc")}><Input value={bcc} onChange={(event) => setBcc(event.target.value)} placeholder={t("message.send.placeholder.ccMails")} /></Field></>}
        {kind === "channel" ? <Field label={t("message.send.field.testContent")}><Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={t("message.send.placeholder.testContent")} /></Field> : <Field label={t("message.send.field.params")}><Textarea value={params} onChange={(event) => setParams(event.target.value)} placeholder={t("message.send.placeholder.params")} /></Field>}
      </div>
    </Drawer>
  </>;
}

export function MyNotifyResourcePage() {
  const t = useT("system");
  const configs = useMessageConfigs();
  const queryClient = useQueryClient();
  const canUpdate = usePermission(configs.notifyMy.permissions.update);
  const markRead = useMutation({
    mutationFn: (ids?: number[]) => apiWrite<void>(`/admin/system/notify-message/${ids ? `update-read?ids=${ids.join(",")}` : "update-all-read"}`, "PUT"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [configs.notifyMy.resourceKey] }),
  });
  const enhanced: ResourcePageConfig = {
    ...configs.notifyMy,
    headerActions: canUpdate ? <Button variant="outline" onClick={() => markRead.mutate(undefined)} disabled={markRead.isPending}>{t("notifyMy.action.markAllRead")}</Button> : undefined,
    rowActions: (record) => Number(record.readStatus) === 1 || !canUpdate ? ({}) : ({ primary: [{ label: t("notifyMy.action.markRead"), tone: "primary", onClick: () => markRead.mutate([record.id]) }] }),
  };
  return <ResourcePage config={enhanced} />;
}
