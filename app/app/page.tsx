import { requireIdentity, signOut } from "@/auth";
import { Dashboard } from "@/components/BoardsApp";
export const dynamic = "force-dynamic";
export default async function AppHome() { const me = await requireIdentity(); return <Dashboard who={{ kind: me.kind, uid: me.uid, name: me.name }} signOutAction={signOut} />; }
