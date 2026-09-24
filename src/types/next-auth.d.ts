import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      esSuperAdmin?: boolean;
      esOwner?: boolean;
      modulosPermitidos?: string[] | "ALL";
      mfaHabilitado?: boolean;
      sesionHash?: string;
    } & DefaultSession["user"];
  }
}
