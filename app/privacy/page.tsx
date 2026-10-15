import Link from "next/link";
import { Mark } from "@/components/board/icons";
export const metadata = { title: "Privacy Policy | MiroIsDead" };
export default function Privacy() {
  return <div className="mi-legal"><Link href="/" className="mi-404-logo"><Mark size={34} />MiroIsDead</Link>
    <article className="mi-legal-card">
      <h1>Privacy Policy</h1><p className="muted">Last updated 15 October 2026</p>
      <h2>What we store</h2><p>If you sign in, your email address and the boards you save are stored in Firebase (Google Cloud, US). Guests and the demo account keep boards in the browser only. Images you add are stored inside the board document.</p>
      <h2>Live sessions</h2><p>Cursors and edits in a live session go directly between collaborators (WebRTC). Only short-lived connection details pass through our database.</p>
      <h2 id="cookies">Cookies and analytics</h2><p>One cookie keeps you signed in. We use PostHog product analytics to see which features are used; you can reject non-essential analytics with the cookie bar on the home page, and we never sell personal data.</p>
      <h2>Your choices</h2><p>Delete a board from your dashboard at any time. To delete your account and all boards, open an issue on GitHub and we will remove them.</p>
      <h2>Contact</h2><p>Questions go to <a href="https://github.com/tommy-muckstack/miroisdead/issues">the project's GitHub issues</a>.</p>
    </article></div>;
}
