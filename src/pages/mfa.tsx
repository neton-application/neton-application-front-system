"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { apiWrite } from "@neton/application-front-runtime/client";
import { Alert, Button, Input, Label } from "@neton/application-front-kit";
import { useT } from "@neton/application-front-runtime/i18n";
import { useDescribeError } from "@neton/application-front-runtime/errors";

type Challenge = { status: "mfa_required" | "mfa_enrollment_required"; challengeToken: string; challengeExpiresAt: number };

export default function MfaPage() {
  const t = useT("system");
  const describeError = useDescribeError();
  const [challenge, setChallenge] = React.useState<Challenge | null>(null);
  const [enrollment, setEnrollment] = React.useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [pending, setPending] = React.useState(false);
  function restart() { sessionStorage.removeItem("neton-mfa-challenge"); window.location.replace("/login"); }
  React.useEffect(() => {
    let cancelled = false;
    let value: Challenge;
    try {
      value = JSON.parse(sessionStorage.getItem("neton-mfa-challenge") || "null");
      if (!value?.challengeToken || value.challengeExpiresAt <= Date.now()) { restart(); return; }
    } catch { restart(); return; }
    setChallenge(value);
    const timer = window.setTimeout(restart, Math.max(0, value.challengeExpiresAt - Date.now()));
    if (value.status === "mfa_enrollment_required") {
      apiWrite<{ secret: string; otpauthUri: string }>("/admin/system/auth/mfa/enrollment", "POST", { challengeToken: value.challengeToken })
        .then(data => { if (!cancelled) setEnrollment(data); })
        .catch(e => { if (!cancelled) setError(describeError(e)); });
    }
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [describeError]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!challenge) return;
    setPending(true); setError("");
    try {
      const result = await apiWrite<{ status: string }>("/admin/system/auth/mfa/verify", "POST", { challengeToken: challenge.challengeToken, code });
      if (result.status !== "authenticated") { setError(t("mfa.error.incomplete")); setCode(""); return; }
      sessionStorage.removeItem("neton-mfa-challenge");
      window.location.replace("/");
    } catch (e) { setError(describeError(e)); setCode(""); }
    finally { setPending(false); }
  }
  const binding = challenge?.status === "mfa_enrollment_required";
  return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6 text-[var(--foreground)]">
    <section className="w-full max-w-md space-y-5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-8">
      <h1 className="text-2xl font-semibold">{binding ? t("mfa.enroll.title") : t("mfa.verify.title")}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{binding ? t("mfa.enroll.description") : t("mfa.verify.description")}</p>
      {error && <Alert tone="error">{error}</Alert>}
      {binding && !enrollment && !error && <p>{t("mfa.enroll.preparing")}</p>}
      {binding && enrollment && <div className="space-y-3">
        <div className="mx-auto w-fit bg-white p-4"><QRCodeSVG value={enrollment.otpauthUri} size={208} /></div>
        <details><summary className="cursor-pointer text-sm">{t("mfa.enroll.manualKey")}</summary><code className="mt-2 block break-all select-all">{enrollment.secret}</code></details>
      </div>}
      <form onSubmit={submit} className="space-y-4">
        <Label htmlFor="mfa-code">{t("mfa.field.code")}</Label>
        <Input id="mfa-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} />
        <Button type="submit" className="w-full" disabled={pending || code.length !== 6 || !challenge || (binding && !enrollment)}>{pending ? t("mfa.action.verifying") : binding ? t("mfa.action.bindAndSignIn") : t("mfa.action.verifyAndSignIn")}</Button>
      </form>
      <Button variant="ghost" onClick={restart}>{t("mfa.action.backToLogin")}</Button>
    </section>
  </main>;
}
