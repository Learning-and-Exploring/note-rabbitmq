// Re-export the Prisma User type as the canonical User model
export type { User } from "@prisma/client";
export type UserRole = "USER" | "ADMIN";

// DTO types used for creating / querying users
export interface CreateUserDto {
  id: string;
  email: string;
  name?: string;
  role?: UserRole;
}

export interface GetUserDto {
  id?: string;
  email?: string;
}
