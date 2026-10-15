import { redirect } from "next/navigation";
import { BP } from "@/lib/basepath";
import { demoEnabled, getIdentity } from "@/auth";
import { firebaseClientConfig, firebaseConfigured } from "@/lib/isdead-auth/config";
import { SiteNav } from "@/components/SiteNav";
import { LoginForm } from "@/components/LoginForm";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const rel = callbackUrl?.startsWith(BP + "/") ? callbackUrl.slice(BP.length) : callbackUrl;
  const to = BP + (rel && /^\/(?!\/)/.test(rel) ? rel : "/app");
  if (await getIdentity()) redirect(to.slice(BP.length) || "/app");
  // Miro-style layout from @isdead/design (templates/marketing-site.md): marketing nav + full-bleed gradient + centered card
  return <>
    <SiteNav />
    <section className="ids-auth"><div className="ids-auth__card mi-login">
      <LoginForm config={firebaseConfigured() ? firebaseClientConfig() : null} demo={demoEnabled()} to={to} />
    </div></section>
  </>;
}
