import { MiNav } from "@/components/MiMk";
import { MiFooter } from "@/components/MiHome2";
import { MiPricing } from "@/components/MiPricing";
import "@/components/mipricing.css";
export const metadata = { title: "Pricing | MiroIsDead" };
export default function Pricing() {
  return <div className="mk mpr-page">
    <MiNav />
    <MiPricing />
    <MiFooter />
  </div>;
}
