"use client";
import * as React from "react";
import { ResourcePage, type ResourcePageConfig, type ResourceRecord } from "@neton/application-front-resource";
import { apiWrite } from "@neton/application-front-runtime/client";
import { useMutation, usePermission, useQueryClient } from "@neton/application-front-runtime/client-context";
import { Alert, Button, Drawer, Field, Input, Textarea } from "@neton/application-front-kit";
const status=[{label:"启用",value:1},{label:"停用",value:0}];
const common=(endpoint:string,key:string,title:string,description:string,fields:ResourcePageConfig["fields"],readOnly=false,listPath="page"):ResourcePageConfig=>({resourceKey:key,eyebrow:"COMMUNICATION CENTER",title,description,endpoint,listPath,readOnly,permissions:{page:`system:${key}:query`,query:`system:${key}:query`,create:`system:${key}:create`,update:`system:${key}:update`,delete:`system:${key}:delete`},fields});
export const configs={
 mailAccount:{...common("/system/mail-account","mail-account","邮箱账号","维护 SMTP 发信身份、主机与加密连接参数。",[{key:"mail",label:"邮箱",required:true},{key:"username",label:"用户名",required:true},{key:"password",label:"密码",required:true,table:false},{key:"host",label:"SMTP 主机",required:true},{key:"port",label:"端口",type:"number",defaultValue:465},{key:"sslEnable",label:"SSL",type:"select",defaultValue:1,options:[{label:"开启",value:1},{label:"关闭",value:0}],table:false},{key:"starttlsEnable",label:"STARTTLS",type:"select",defaultValue:0,options:[{label:"开启",value:1},{label:"关闭",value:0}],table:false},{key:"status",label:"状态",type:"select",defaultValue:1,format:"status",options:status},{key:"remark",label:"说明",type:"textarea",table:false},{key:"createTime",label:"创建时间",format:"date"},{key:"mail",label:"邮箱",filter:true,table:false},{key:"status",label:"状态",filter:true,table:false,type:"select",options:status}]),mapSave:(record:ResourceRecord)=>({...record,sslEnable:Boolean(Number(record.sslEnable)),starttlsEnable:Boolean(Number(record.starttlsEnable))})},
 mailTemplate:common("/system/mail-template","mail-template","邮件模板","维护邮件内容、参数定义和发送渠道。",templateFields()),
 mailLog:common("/system/mail-log","mail-log","邮件日志","查询邮件投递结果与失败原因。",logFields(),true),
 smsChannel:common("/system/sms-channel","sms-channel","短信渠道","维护短信供应商通道及结构化配置。",channelFields("sms")),
 smsTemplate:common("/system/sms-template","sms-template","短信模板","维护短信内容、参数定义和渠道绑定。",templateFields()),
 smsLog:common("/system/sms-log","sms-log","短信日志","查询短信发送结果与失败原因。",logFields(),true),
 notifyTemplate:common("/system/notify-template","notify-template","站内通知模板","将业务通知语义映射到消息模板。",[{key:"name",label:"模板名称",required:true},{key:"code",label:"模板编码",required:true,format:"mono"},{key:"type",label:"类型",type:"number",defaultValue:0},{key:"messageTemplateId",label:"消息模板 ID",type:"number",required:true},{key:"params",label:"参数定义",type:"textarea",table:false},{key:"status",label:"状态",type:"select",defaultValue:1,format:"status",options:status},{key:"remark",label:"说明",type:"textarea",table:false},{key:"createdAt",label:"创建时间",format:"date"},{key:"name",label:"名称",filter:true,table:false},{key:"code",label:"编码",filter:true,table:false}]),
 notifyMessage:common("/system/notify-message","notify-message","站内通知记录","查询全平台通知记录及用户读取状态。",notifyFields(),true),
 notifyMy:common("/system/notify-message","notify-message","我的通知","查看当前管理员收到的站内通知。",notifyFields(),true,"my-page"),
 socialUser:common("/system/social-user","social-user","社交身份","查看当前账号绑定的第三方平台身份。",[{key:"id",label:"记录 ID",format:"mono"},{key:"socialType",label:"平台"},{key:"openId",label:"Open ID",format:"mono"},{key:"nickname",label:"昵称"},{key:"createdAt",label:"绑定时间",format:"date"}],true,"list")
};
function templateFields(){return [{key:"name",label:"模板名称",required:true},{key:"code",label:"模板编码",required:true,format:"mono" as const},{key:"content",label:"内容",type:"textarea" as const,required:true},{key:"channelId",label:"渠道 ID",type:"number" as const,required:true},{key:"type",label:"类型",type:"number" as const,defaultValue:0},{key:"status",label:"状态",type:"select" as const,defaultValue:1,format:"status" as const,options:status},{key:"params",label:"参数定义",type:"textarea" as const,table:false},{key:"remark",label:"说明",type:"textarea" as const,table:false},{key:"createdAt",label:"创建时间",format:"date" as const},{key:"name",label:"名称",filter:true,table:false},{key:"code",label:"编码",filter:true,table:false}];}
function channelFields(type:string){return [{key:"name",label:"渠道名称",required:true},{key:"code",label:"渠道编码",required:true,format:"mono" as const},{key:"type",label:"渠道类型",defaultValue:type},{key:"config",label:"渠道配置 JSON",type:"textarea" as const,table:false},{key:"status",label:"状态",type:"select" as const,defaultValue:1,format:"status" as const,options:status},{key:"remark",label:"说明",type:"textarea" as const,table:false},{key:"createdAt",label:"创建时间",format:"date" as const},{key:"name",label:"名称",filter:true,table:false},{key:"status",label:"状态",filter:true,table:false,type:"select" as const,options:status}];}
function logFields(){return [{key:"id",label:"记录 ID",format:"mono" as const},{key:"receiver",label:"接收方"},{key:"templateCode",label:"模板编码",format:"mono" as const},{key:"sendStatus",label:"发送状态"},{key:"errorMessage",label:"失败原因"},{key:"sendTime",label:"发送时间",format:"date" as const},{key:"receiver",label:"接收方",filter:true,table:false},{key:"sendStatus",label:"发送状态",filter:true,table:false}];}
function notifyFields(){return [{key:"id",label:"通知 ID",format:"mono" as const},{key:"userId",label:"用户 UID",format:"mono" as const},{key:"templateCode",label:"模板编码",format:"mono" as const},{key:"templateContent",label:"内容"},{key:"readStatus",label:"读取状态"},{key:"createdAt",label:"创建时间",format:"date" as const},{key:"userId",label:"用户 UID",filter:true,table:false},{key:"readStatus",label:"读取状态",filter:true,table:false}];}
export function MessageResourcePage({config}:{config:ResourcePageConfig}){return <ResourcePage config={config}/>}

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

export function ActionMessageResourcePage({ config, kind }: { config: ResourcePageConfig; kind: MessageActionKind }) {
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
      if (!target || !receiver.trim()) throw new Error(kind === "mail" ? "请填写收件邮箱" : "请填写接收方");
      const code = String(target.record.code ?? "");
      if (kind === "channel") {
        if (!content.trim()) throw new Error("请填写测试内容");
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
    onError: (cause: Error) => setError(cause.message),
  });

  const enhanced: ResourcePageConfig = {
    ...config,
    rowActions: (record) => {
      const existing = config.rowActions?.(record) ?? {};
      return {
        primary: existing.primary,
        more: [
          ...(canUpdate ? [{ label: kind === "channel" ? "测试发送" : "发送", tone: "primary" as const, onClick: () => { setError(null); setTarget({ kind, record }); } }] : []),
          ...(existing.more ?? []),
        ],
      };
    },
  };

  return <>
    <ResourcePage config={enhanced} />
    <Drawer open={Boolean(target)} onClose={() => setTarget(null)} title={kind === "channel" ? "测试发送" : `发送${config.title}`} description={kind === "channel" ? String(target?.record.name ?? "") : `模板：${String(target?.record.code ?? "-")}`} footer={<><Button variant="ghost" onClick={() => setTarget(null)}>取消</Button><Button onClick={() => send.mutate()} disabled={send.isPending}>{send.isPending ? "发送中…" : "确认发送"}</Button></>}>
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label={kind === "mail" ? "收件邮箱" : "接收方"}><Input value={receiver} onChange={(event) => setReceiver(event.target.value)} placeholder={kind === "mail" ? "多个邮箱用逗号或换行分隔" : "手机号、用户 UID 或目标地址"} /></Field>
        {kind === "mail" && <><Field label="抄送（可选）"><Input value={cc} onChange={(event) => setCc(event.target.value)} placeholder="多个邮箱用逗号分隔" /></Field><Field label="密送（可选）"><Input value={bcc} onChange={(event) => setBcc(event.target.value)} placeholder="多个邮箱用逗号分隔" /></Field></>}
        {kind === "channel" ? <Field label="测试内容"><Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="输入用于验证渠道连通性的内容" /></Field> : <Field label="模板参数（可选）"><Textarea value={params} onChange={(event) => setParams(event.target.value)} placeholder={"每行一个参数，例如：\nname=张三\ncode=123456"} /></Field>}
      </div>
    </Drawer>
  </>;
}

export function MyNotifyResourcePage() {
  const queryClient = useQueryClient();
  const canUpdate = usePermission(configs.notifyMy.permissions.update);
  const markRead = useMutation({
    mutationFn: (ids?: number[]) => apiWrite<void>(`/admin/system/notify-message/${ids ? `update-read?ids=${ids.join(",")}` : "update-all-read"}`, "PUT"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [configs.notifyMy.resourceKey] }),
  });
  const enhanced: ResourcePageConfig = {
    ...configs.notifyMy,
    headerActions: canUpdate ? <Button variant="outline" onClick={() => markRead.mutate(undefined)} disabled={markRead.isPending}>全部标记已读</Button> : undefined,
    rowActions: (record) => Number(record.readStatus) === 1 || !canUpdate ? ({}) : ({ primary: [{ label: "标记已读", tone: "primary", onClick: () => markRead.mutate([record.id]) }] }),
  };
  return <ResourcePage config={enhanced} />;
}
