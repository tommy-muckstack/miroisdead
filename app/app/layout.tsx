import { requireIdentity } from "@/auth";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) { await requireIdentity(); return <>{children}</>; }
