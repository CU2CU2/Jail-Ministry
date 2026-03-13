import { auth } from "@/auth";
import { ScheduleList } from "./schedule-list";

export const metadata = { title: "Schedule — Jail Ministry" };

export default async function SchedulePage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visit Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sign up for an upcoming visit by selecting a mod with an open slot.
        </p>
      </div>

      <ScheduleList userCounty={session!.user.county} />
    </div>
  );
}
