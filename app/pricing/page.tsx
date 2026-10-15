import { getIdentity } from "@/auth";
const signedIn = async () => { const me = await getIdentity(); return me?.kind === "firebase" || me?.kind === "demo"; }; // guests are not signed in
import { MiNav } from "@/components/MiMk";
import { MiFooter } from "@/components/MiHome2";
import { MiPricing } from "@/components/MiPricing";
import "@/components/mipricing.css";
export const metadata = { title: "Pricing | MiroIsDead" };
export const dynamic = "force-dynamic";
export default async function Pricing() {
  return <div className="mk mpr-page">
    <MiNav signedIn={await signedIn()} />
    <MiPricing />
    <MiFooter />
  </div>;
}
