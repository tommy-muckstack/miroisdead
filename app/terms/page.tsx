import Link from "next/link";
import { Mark } from "@/components/board/icons";
export const metadata = { title: "Terms of Service | MiroIsDead" };
export default function Terms() {
  return <div className="mi-legal"><Link href="/" className="mi-404-logo"><Mark size={34} />MiroIsDead</Link>
    <article className="mi-legal-card">
      <h1>Terms of Service</h1><p className="muted">Last updated 15 October 2026</p>
      <p>MiroIsDead is a free, open-source online whiteboard. By using it you agree to these terms.</p>
      <h2>The service</h2><p>MiroIsDead is provided as is, without warranty of any kind, and may change or stop at any time. There are no paid plans: every feature is free.</p>
      <h2>Your content</h2><p>Boards you create belong to you. We store them only to show them back to you and to the people you share a link with. You are responsible for what you put on a board and for the links you share.</p>
      <h2>Acceptable use</h2><p>Do not use MiroIsDead to break the law, to harass people, or to attack the service. We may remove content or accounts that do.</p>
      <h2>Open source</h2><p>The software is licensed under Apache-2.0. You can read, run and change it at <a href="https://github.com/tommy-muckstack/miroisdead">github.com/tommy-muckstack/miroisdead</a>.</p>
      <h2>Trademarks</h2><p>MiroIsDead is an independent project. It is not affiliated with, endorsed by or sponsored by RealtimeBoard, Inc. (Miro). Miro is a trademark of its owner.</p>
      <h2>Contact</h2><p>Questions go to the project's GitHub issues.</p>
    </article></div>;
}
