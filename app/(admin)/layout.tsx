import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";

const ADMIN_ROLES = ["SUPER_ADMIN", "COUNTY_COORDINATOR"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ADMIN_ROLES.includes(session.user.role)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav session={session} />
      <div className="md:pl-64 pt-14 md:pt-0">
        <main className="p-4 md:p-8 max-w-5xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
