import { UserType, PlateType, PlateStatus } from '@prisma/client';

export interface JWTPayload {
  id: string;
  userType: UserType;
  name: string;
  phoneNumber: string;
  iat?: number;
  exp?: number;
}

export interface UserCreateInput {
  name: string;
  phoneNumber: string;
  homeNumber: string;
  userType: UserType;
}

export interface PlateCreateInput {
  plateCode: string;
  plateNumber: string;
  country: string;
  emirate?: string;
  type: PlateType;
  userId: string;
}

export interface DocumentCreateInput {
  type: string;
  url: string;
  plateId: string;
}

export interface NotificationCreateInput {
  userId: string;
  message: string;
}

export interface EntryCreateInput {
  plateId: string;
  userId: string;
  type: 'ENTRY' | 'EXIT';
}

export interface SystemConfigUpdateInput {
  guestAccessDuration?: number;
  maxPersonalPlates?: number;
}

export interface OTPResponse {
  success: boolean;
  message: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    phoneNumber: string;
    homeNumber: string;
    userType: UserType;
  };
} 