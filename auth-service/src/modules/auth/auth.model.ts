// Re-export the Prisma Auth type as the canonical Auth model
export type { Auth } from "@prisma/client";

// DTO types used for creating / querying auths
export interface CreateAuthDto {
  email: string;
  password: string;
  name?: string;
}

export interface GetAuthDto {
  id?: string;
  email?: string;
}

export interface VerifyEmailDto {
  email: string;
  otp: string;
}

export interface ResendEmailOtpDto {
  email: string;
}

export interface LoginAuthDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface LogoutDto {
  refreshToken: string;
}
