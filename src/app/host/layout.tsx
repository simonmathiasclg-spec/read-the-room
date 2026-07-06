import { HostMusic } from "@/components/HostMusic";

/**
 * Host-route layout. Because it wraps (and outlives) the host page's internal
 * screen swaps, the music engine keeps playing seamlessly from lobby → questions
 * → podium. Rendering it here also guarantees the toggle only ever exists on the
 * host screen — never on the players' /play route.
 */
export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <HostMusic />
    </>
  );
}
