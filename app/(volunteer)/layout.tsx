import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";

export default async function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav session={session} />
      {/* Content shifted right on desktop to account for fixed sidebar */}
      <div className="md:pl-64 pt-14 md:pt-0">
        <main className="p-4 md:p-8 max-w-5xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
