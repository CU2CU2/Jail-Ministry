import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 flex flex-col items-center justify-center px-4 text-white">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Jail Ministry</h1>
          <p className="text-blue-200 text-lg">
            Douglas &amp; Sarpy County Volunteer Portal
          </p>
        </div>

        <p className="text-blue-100 text-base leading-relaxed">
          Thank you for your commitment to serving those who are incarcerated.
          Register below to join our team of volunteers, or log in to manage your
          schedule.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/register"
            className="bg-white text-blue-900 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors text-center"
          >
            Register as a Volunteer
          </Link>
          <Link
            href="/login"
            className="border border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 transition-colors text-center"
          >
            Log In
          </Link>
        </div>

        <p className="text-blue-300 text-sm pt-4">
          Already registered? Your account will be reviewed by a county coordinator
          before you can sign up for visits.
        </p>
      </div>
    </main>
  );
}
