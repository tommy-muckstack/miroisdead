import Link from "next/link";
import { Mark } from "@/components/board/icons";
/** 404, styled after Miro's "page not found" (centred card on the warm canvas background). */
export default function NotFound() {
  return <div className="mi-404"><Link href="/" className="mi-404-logo"><Mark size={34} />MiroIsDead</Link>
    <div className="mi-404-card"><div className="mi-404-art" aria-hidden><i /><i /><i /></div><h1>We can’t find that page</h1><p>The board or page you’re looking for doesn’t exist, was deleted, or you don’t have access to it.</p>
      <div className="mi-404-acts"><Link className="mx-dark" href="/app">Go to your boards</Link><Link className="mx-light" href="/">Back to home</Link></div></div></div>;
}
