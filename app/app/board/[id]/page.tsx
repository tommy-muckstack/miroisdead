import { requireIdentity, signOut } from "@/auth";
import { BoardPage } from "@/components/BoardsApp";
import { firebaseClientConfig } from "@/lib/isdead-auth/config";
export const dynamic = "force-dynamic";
export default async function Board({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const me = await requireIdentity(`/app/board/${id}`); return <BoardPage who={{ kind: me.kind, uid: me.uid, name: me.name }} id={id} signOutAction={signOut} rtc={firebaseClientConfig()} />; }
