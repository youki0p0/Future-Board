export default function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-5 py-12">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-makina-accent">Project MAKINA</p>
        <h1 className="mt-2 text-3xl font-bold">Future Board</h1>
        <p className="mt-1 text-makina-muted">仕込め。踏め。笑え。</p>
      </div>

      <div className="mk-panel w-full p-6">
        <h2 className="text-lg font-semibold text-makina-warn">⚙ セットアップが必要です</h2>
        <p className="mt-3 text-sm leading-relaxed text-makina-muted">
          Supabase の環境変数が設定されていません。以下の変数を <code className="text-makina-text">.env.local</code>{" "}
          または Vercel の Environment Variables に登録してください。
        </p>

        <pre className="mt-4 overflow-x-auto rounded-xl border border-makina-line bg-makina-bg/70 p-4 text-xs text-makina-text mk-scroll">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`}
        </pre>

        <ul className="mt-4 space-y-2 text-sm text-makina-muted">
          <li>• Publishable (anon) key のみを使用します。</li>
          <li>• service_role / secret key は絶対に使用しないでください。</li>
          <li>
            • 詳細は <code className="text-makina-text">docs/SETUP.md</code> を参照してください。
          </li>
        </ul>
      </div>
    </main>
  );
}
