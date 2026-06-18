/** Shown when .env.local has no Firebase keys yet, so the app explains itself
 *  instead of throwing. */
export default function SetupNotice() {
  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-16">
      <span className="inline-block h-1 w-16 rounded-full bg-psc-gold" />
      <h1 className="text-2xl font-black">Almost there — add your Firebase keys</h1>
      <p className="text-psc-gray-2">
        This app needs a Firebase Realtime Database to sync rooms. Create a
        project at{" "}
        <a
          className="font-semibold text-psc-red underline"
          href="https://console.firebase.google.com"
          target="_blank"
          rel="noreferrer"
        >
          console.firebase.google.com
        </a>
        , enable Realtime Database, then copy{" "}
        <code className="rounded bg-black/5 px-1 py-0.5">.env.local.example</code>{" "}
        to <code className="rounded bg-black/5 px-1 py-0.5">.env.local</code> and
        fill in your web app config. Restart the dev server afterward.
      </p>
    </main>
  );
}
