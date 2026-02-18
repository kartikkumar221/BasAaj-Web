import api, { setTokens } from "./api";

// ── Response types matching Spring Boot DTOs ──

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  isNewUser: boolean;
  userId: string;
  role: string;
  profileComplete: boolean;
}

export interface SellerProfile {
  name: string;
  profilePicUrl?: string;
  category?: string;
  subcategory?: string;
  subcategoryName?: string;
}

export interface UserProfileResponse {
  id: string;
  phone?: string;
  name?: string;
  email?: string;
  role?: string;
  sellerProfile?: SellerProfile;
  profileComplete?: boolean;
}

// ── API calls ──

export const sendOtp = async (phone: string): Promise<void> => {
  await api.post<ApiResponse<void>>("/api/v1/auth/otp/send", { phone });
};

export const verifyOtp = async (
  phone: string,
  otp: string
): Promise<AuthResponse> => {
  const res = await api.post<ApiResponse<AuthResponse>>(
    "/api/v1/auth/otp/verify",
    { phone, otp }
  );
  const auth = res.data.data;

  // Persist tokens
  setTokens(auth.token, auth.refreshToken);

  return auth;
};

export const getUserProfile = async (): Promise<UserProfileResponse> => {
  const res = await api.get<ApiResponse<UserProfileResponse>>(
    "/api/v1/users/profile"
  );
  return res.data.data;
};

export interface OnboardSellerData {
  name: string;
  location?: {
    city: string;
    region: string;
    country: string;
    displayName: string;
    lat: number;
    lng: number;
    placeId?: string;
  };
}

export const onboardSeller = async (
  data: OnboardSellerData,
  profilePicture?: File | null
): Promise<UserProfileResponse> => {
  const formData = new FormData();
  formData.append("data", JSON.stringify(data));

  if (profilePicture) {
    formData.append("profilePicture", profilePicture);
  }

  const res = await api.post<ApiResponse<UserProfileResponse>>(
    "/api/v1/users/seller-profile/onboard",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data.data;
};
