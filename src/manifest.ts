import { defineFrontModule } from "@neton/application-front-contract";

/** page key == 后端 system_menus.component（base V002 seed：/system 下 user 等）。 */
export default defineFrontModule({
  id: "system",
  contractVersion: "1.0.0",
  pages: [
    { key: "system/user/index", path: "/system/user", entry: "user-list", rendering: "client" },
    { key: "system/role/index", path: "/system/role", entry: "role-list", rendering: "client" },
    { key: "system/menu/index", path: "/system/menu", entry: "menu-list", rendering: "client" },
    { key: "system/dept/index", path: "/system/dept", entry: "dept-list", rendering: "client" },
    { key: "system/post/index", path: "/system/post", entry: "post-list", rendering: "client" },
    { key: "system/dict/index", path: "/system/dict", entry: "dict-list", rendering: "client" },
    { key: "system/notice/index", path: "/system/notice", entry: "notice-list", rendering: "client" },
    { key: "system/loginlog/index", path: "/system/login-log", entry: "login-log", rendering: "client" },
    { key: "system/operatelog/index", path: "/system/operate-log", entry: "operate-log", rendering: "client" },
    { key: "system/mail/account/index", path: "/system/mail/account", entry: "mail-account", rendering: "client" },
    { key: "system/mail/template/index", path: "/system/mail/template", entry: "mail-template", rendering: "client" },
    { key: "system/mail/log/index", path: "/system/mail/log", entry: "mail-log", rendering: "client" },
    { key: "system/sms/channel/index", path: "/system/sms/channel", entry: "sms-channel", rendering: "client" },
    { key: "system/sms/template/index", path: "/system/sms/template", entry: "sms-template", rendering: "client" },
    { key: "system/sms/log/index", path: "/system/sms/log", entry: "sms-log", rendering: "client" },
    { key: "system/notify/template/index", path: "/system/notify/template", entry: "notify-template", rendering: "client" },
    { key: "system/notify/message/index", path: "/system/notify/message", entry: "notify-message", rendering: "client" },
    { key: "system/notify/my/index", path: "/system/notify/my", entry: "notify-my", rendering: "client" },
    { key: "system/social/user/index", path: "/system/social/user", entry: "social-user", rendering: "client" },
  ],
});
