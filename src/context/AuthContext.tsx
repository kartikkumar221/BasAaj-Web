import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { LocationData } from "./LocationContext";
import * as authService from "../services/authService";
import { getToken, clearTokens } from "../services/api";
import { AxiosError } from "axios";

export interface UserProfile {
  businessName: string;
  profileImage: string | null;
  location: LocationData | null;
  phone: string;
  email: string;
  name: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  user: UserProfile | null;
  loginOpen: boolean;
  otpOpen: boolean;
  profileSetupOpen: boolean;
  mobile: string;
  pendingRedirect: string | null;
  openLogin: (redirectTo?: string) => void;
  closeLogin: () => void;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  closeOtp: () => void;
  openProfileSetup: () => void;
  closeProfileSetup: () => void;
  completeProfileSetup: (
    profile: Pick<UserProfile, "businessName" | "profileImage" | "location">,
    profileFile?: File | null
  ) => Promise<void>;
  logout: () => void;
  clearPendingRedirect: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof AxiosError) {
    return (
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message
    );
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [mobile, setMobile] = useState("");
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);

  // Map backend profile to frontend UserProfile
  const mapUserProfile = (
    profile: authService.UserProfileResponse
  ): UserProfile => ({
    businessName: profile.sellerProfile?.name || profile.name || "",
    profileImage: profile.sellerProfile?.profilePicUrl || null,
    location: null, // location comes from LocationContext
    phone: profile.phone || "",
    email: profile.email || "",
    name: profile.name || "",
  });

  // Auto-login: check for existing token on mount
  const initAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsAuthLoading(false);
      return;
    }

    try {
      const profile = await authService.getUserProfile();
      setUser(mapUserProfile(profile));
      setIsLoggedIn(true);
    } catch {
      clearTokens();
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Dialog controls
  const openLogin = (redirectTo?: string) => {
    if (redirectTo) setPendingRedirect(redirectTo);
    setLoginOpen(true);
  };
  const closeLogin = () => setLoginOpen(false);
  const clearPendingRedirect = () => setPendingRedirect(null);

  // Step 1: Send OTP
  const handleSendOtp = async (phone: string) => {
    try {
      await authService.sendOtp(phone);
      setMobile(phone);
      setLoginOpen(false);
      setOtpOpen(true);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (otp: string) => {
    try {
      const authRes = await authService.verifyOtp(mobile, otp);

      if (authRes.isNewUser === true && authRes.profileComplete === false) {
        // New user without profile → show profile setup
        setOtpOpen(false);
        setProfileSetupOpen(true);
      } else {
        // Existing user or profile already complete → log in
        const profile = await authService.getUserProfile();
        setUser(mapUserProfile(profile));
        setIsLoggedIn(true);
        setOtpOpen(false);
      }
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  // Step 3 (new users): Profile setup
  const openProfileSetup = () => {
    setOtpOpen(false);
    setProfileSetupOpen(true);
  };

  const closeOtp = () => setOtpOpen(false);

  const closeProfileSetup = () => setProfileSetupOpen(false);

  const completeProfileSetup = async (
    profile: Pick<UserProfile, "businessName" | "profileImage" | "location">,
    profileFile?: File | null
  ) => {
    try {
      const result = await authService.onboardSeller(
        {
          name: profile.businessName,
          location: profile.location
            ? {
                city: profile.location.city,
                region: profile.location.region,
                country: profile.location.country,
                displayName: profile.location.displayName,
                lat: profile.location.lat,
                lng: profile.location.lng,
                placeId: profile.location.placeId,
              }
            : undefined,
        },
        profileFile
      );

      setUser(mapUserProfile(result));
      setIsLoggedIn(true);
      setProfileSetupOpen(false);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isAuthLoading,
        user,
        loginOpen,
        otpOpen,
        profileSetupOpen,
        mobile,
        pendingRedirect,
        openLogin,
        closeLogin,
        sendOtp: handleSendOtp,
        verifyOtp: handleVerifyOtp,
        closeOtp,
        openProfileSetup,
        closeProfileSetup,
        completeProfileSetup,
        logout,
        clearPendingRedirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
