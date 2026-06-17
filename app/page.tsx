import HomeScreen from "@/components/HomeScreen";
import SetupRequired from "@/components/SetupRequired";
import { isSupabaseConfigured } from "@/lib/supabase";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupRequired />;
  const { code } = await searchParams;
  return <HomeScreen initialCode={(code ?? "").toUpperCase()} />;
}
