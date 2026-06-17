import RoomClient from "./RoomClient";
import SetupRequired from "@/components/SetupRequired";
import { isSupabaseConfigured } from "@/lib/supabase";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupRequired />;
  const { code } = await params;
  return <RoomClient code={code.toUpperCase()} />;
}
