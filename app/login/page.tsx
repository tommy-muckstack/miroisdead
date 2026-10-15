import { redirect } from "next/navigation";
import { BP } from "@/lib/basepath";
import { demoEnabled, getIdentity } from "@/auth";
import { firebaseClientConfig, firebaseConfigured } from "@/lib/isdead-auth/config";
import { MiAuth } from "@/components/MiAuth";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in | MiroIsDead" };
export default async function Login({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const rel = callbackUrl?.startsWith(BP + "/") ? callbackUrl.slice(BP.length) : callbackUrl;
  const to = BP + (rel && /^\/(?!\/)/.test(rel) ? rel : "/app");
  if (await getIdentity()) redirect(to.slice(BP.length) || "/app");
  return <MiAuth config={firebaseConfigured() || process.env.NODE_ENV !== "production" ? firebaseClientConfig() : null} demo={demoEnabled()} to={to} mode="signin" />;
}
