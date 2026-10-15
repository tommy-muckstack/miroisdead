import { redirect } from "next/navigation";
import { BP } from "@/lib/basepath";
import { demoEnabled, getIdentity } from "@/auth";
import { firebaseClientConfig, firebaseConfigured } from "@/lib/isdead-auth/config";
import { MiAuth } from "@/components/MiAuth";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sign up | MiroIsDead" };
export default async function Signup() {
  if (await getIdentity()) redirect("/app");
  return <MiAuth config={firebaseConfigured() || process.env.NODE_ENV !== "production" ? firebaseClientConfig() : null} demo={demoEnabled()} to={BP + "/app"} mode="signup" />;
}
