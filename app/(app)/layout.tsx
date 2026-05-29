// Route-group layout: gate on a member session, then wrap everything in the app Shell.
// /login lives OUTSIDE this group, so it renders chrome-free.
import Shell from "@/components/Shell";
import { requireMember } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireMember(); // redirects to /login when there's no session
  return <Shell>{children}</Shell>;
}
