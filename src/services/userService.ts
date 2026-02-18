import api from "./api";
import type { ApiResponse } from "./authService";

// ── Saved Address ──

export interface SavedAddressDto {
  id: string;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

// ── Recent Activity ──

export interface RecentActivityResponse {
  recentCategories: { code: string; name: string; usedAt: string }[];
  recentLocations: { address: string; latitude: number; longitude: number; usedAt: string }[];
  savedAddresses: SavedAddressDto[];
}

export const getRecentActivity = async (): Promise<RecentActivityResponse> => {
  const res = await api.get<ApiResponse<RecentActivityResponse>>(
    "/api/v1/users/recent-activity"
  );
  return res.data.data;
};

// ── Address CRUD ──

export const addSavedAddress = async (
  label: string,
  address: string,
  latitude: number,
  longitude: number
): Promise<void> => {
  await api.post("/api/v1/users/locations", {
    label,
    location: { latitude, longitude, address },
  });
};

export const deleteSavedAddress = async (locationId: string): Promise<void> => {
  await api.delete(`/api/v1/users/locations/${locationId}`);
};
