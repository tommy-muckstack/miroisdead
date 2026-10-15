// Each page under /app calls requireIdentity(next) itself so guests are sent back to the exact page they asked for.
export const dynamic = "force-dynamic";
export default function AppLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
