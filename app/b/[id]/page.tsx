import { getIdentity } from "@/auth";
import { getRepo } from "@/lib/server/repo";
import { getPublicBoard } from "@/lib/server/boards-api";
import { PublicBoardPage } from "@/components/PublicBoard";
import { firebaseClientConfig } from "@/lib/isdead-auth/config";
export const dynamic = "force-dynamic";
export const metadata = { title: "Shared board | MiroIsDead" };
/** Public board link: /b/{id}. Works for anyone when the owner chose "Can view" or "Can edit" in Share. */
export default async function SharedBoard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ embed?: string; frame?: string }> }) {
  const { id } = await params; const { embed, frame } = await searchParams;
  const r = await getPublicBoard(getRepo(), id); const me = await getIdentity();
  if (r.status !== 200) return <div className="mi-loading"><h1 className="ids-h2">This board isn’t shared</h1><p className="ids-muted">Ask the owner to turn on “Anyone with the link” in Share.</p></div>;
  const { board, access } = r.body as { board: import("@/lib/canvas/types").Board; access: "view" | "edit" };
  return <PublicBoardPage board={board} access={access} who={me?.name ?? "Guest"} embed={embed === "1"} startFrame={frame} rtc={me?.kind === "firebase" ? firebaseClientConfig() : null} />;
}
