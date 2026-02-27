// Re-export the Prisma User type as the canonical User model
export type { User } from "@prisma/client";

// DTO types used for creating / querying users
export interface CreateUserDto {
  id: string;
  email: string;
  name?: string;
}

export interface GetUserDto {
  id?: string;
  email?: string;
}
