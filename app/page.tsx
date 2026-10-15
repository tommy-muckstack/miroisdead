import { MiNav, HeroArt, HeroForm, CookieBar } from "@/components/MiMk";
import { MiNeedle, MiExperience, MiHelp, MiFooter, MiFlow, MiPlatform, MiLogos } from "@/components/MiHome2";
import { HeroTabs } from "@/components/HeroTabs";
export default function Home() {
  return <div className="mk">
    <MiNav />
    <section className="mk-hero"><h1>Human collaboration<br />at the speed of AI</h1>
      <p className="sub">The intelligent canvas where your team and agents think, plan, and build together</p>
      <HeroForm /><HeroArt /></section>
    <MiLogos />
    <section className="mk-tabsec" id="templates"><HeroTabs /></section>
    <MiFlow />
    <MiNeedle />
    <MiExperience />
    <MiPlatform />
    <MiHelp />
    <MiFooter />
    <CookieBar />
  </div>;
}
