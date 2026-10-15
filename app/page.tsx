import { MiNav, HeroArt, HeroForm, JoinBar } from "@/components/MiMk";
import { MiNeedle, MiExperience, MiHelp, MiFooter } from "@/components/MiHome2";
import { HeroTabs } from "@/components/HeroTabs";
export default function Home() {
  return <div className="mk">
    <MiNav />
    <section className="mk-hero"><h1>Human collaboration<br />at the speed of AI</h1>
      <p className="sub">The free, open-source canvas where your ideas, notes and diagrams come together.</p>
      <HeroForm /><HeroArt /></section>
    <section className="mk-tabsec" id="templates"><HeroTabs /></section>
    <MiNeedle />
    <MiExperience />
    <MiHelp />
    <MiFooter />
    <JoinBar />
  </div>;
}
