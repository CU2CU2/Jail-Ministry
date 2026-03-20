import type { DefaultSession } from "next-auth";
import type { Role, VolunteerStatus, UserCounty } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      status: VolunteerStatus;
      county: UserCounty | null;
    };
  }

}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: VolunteerStatus;
    county: UserCounty | null;
  }
}
