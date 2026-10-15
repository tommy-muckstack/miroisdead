import Link from "next/link";
import { NavBar } from "@isdead/design";
import { Logo } from "@/components/Logo";
import { BP } from "@/lib/basepath";
// Marketing nav shared by the homepage and /login (design-system template: templates/marketing-site.md)
export function SiteNav() {
  return <NavBar brand={<Link href="/" style={{ color: "inherit", textDecoration: "none" }}><Logo /></Link>}
    links={[{ href: BP + "/#product", label: "Product" }, { href: BP + "/#templates", label: "Templates" }, { href: BP + "/#solutions", label: "Solutions" }, { href: BP + "/#pricing", label: "Pricing" }]}
    actions={<><Link className="ids-btn ids-btn--ghost" href="/login">Log in</Link><Link className="ids-btn ids-btn--primary" href="/login">Get started free</Link></>} />;
}
