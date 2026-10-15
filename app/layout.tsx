import "@/vendor/isdead-design/css/miro.css";
import "@/vendor/isdead-design/css/components.css";
import "./globals.css";
import { Analytics } from "@/lib/analytics/posthog";
export const metadata = { title: "MiroIsDead: a free, open-source online whiteboard", description: "An infinite canvas with sticky notes, shapes, connectors, frames and freehand ink. Free and open source.", icons: { icon: "/miroisdead/favicon.svg" } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-ids-theme="miro"><body className="ids-root">{children}<Analytics /></body></html>;
}
