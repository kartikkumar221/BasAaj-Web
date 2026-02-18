import api from "./api";
import type { ApiResponse } from "./authService";

// ── Common types ──

export interface LocationDTO {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ── Discovery types ──

export interface DiscoveryDealResponse {
  id: string;
  title: string;
  description: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaItems?: { url: string; type: string; position: number }[];
  category: string;

  originalPrice?: number;
  dealPrice?: number;
  discountPercent?: number;

  remainingQuantity?: number;
  startTime: string;
  expiryTime: string;
  timeLeftMinutes?: number;

  location?: LocationDTO;
  distanceKm?: number;

  fulfillmentModes?: string[];
  deliveryRadiusKm?: number;
  contactPhone?: string;

  tags?: string[];
  postType: string;
  eventDate?: string;

  seller: {
    id: string;
    name: string;
    category?: string;
    phone?: string;
    profilePicUrl?: string;
  };

  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  userReaction?: string | null; // "LIKE", "DISLIKE", or null

  cardType?: string;
  isUrgent?: boolean;
  hasDelivery?: boolean;
  hasWalkIn?: boolean;
  primaryAction?: string;
  requiresDetailView?: boolean;

  bundleItems?: unknown[];
  bundleType?: string;
  bundleSummary?: string;
  appointmentSlots?: unknown[];
  serviceDurationMinutes?: number;
  availableSlotsCount?: number;
}

export interface DiscoverDealsParams {
  latitude: number;
  longitude: number;
  radius?: number;
  q?: string;
  category?: string;
  subcategory?: string;
  postType?: string;
  dealType?: string;
  fulfillmentMode?: string;
  tags?: string[];
  page?: number;
  size?: number;
  sort?: string;
}

// ── Deal management types ──

export interface CreateDealRequest {
  postType: string;
  dealType?: string;
  subcategoryCode?: string;
  subcategoryName?: string;
  title: string;
  description?: string;
  originalPrice?: number;
  dealPrice?: number;
  discountValue?: number;
  serviceDurationMinutes?: number;
  totalQuantity?: number;
  location?: LocationDTO;
  fulfillmentModes?: string[];
  deliveryRadiusKm?: number;
  contactPhone?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  eventDate?: string;
  startTime?: string;
  expiryTime?: string;
}

export interface DealResponse {
  id: string;
  userId: string;
  postType: string;
  dealType?: string;
  dealTypeName?: string;
  subcategoryCode?: string;
  subcategoryName?: string;
  title: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaItems?: { url: string; type: string; position: number }[];
  originalPrice?: number;
  dealPrice?: number;
  discountValue?: number;
  serviceDurationMinutes?: number;
  totalQuantity?: number;
  remainingQuantity?: number;
  location?: LocationDTO;
  fulfillmentModes?: string[];
  deliveryRadiusKm?: number;
  contactPhone?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  eventDate?: string;
  state: string;
  startTime: string;
  expiryTime: string;
  viewCount: number;
  redemptionCount: number;
  likeCount: number;
  dislikeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DealStatsResponse {
  totalDeals: number;
  activeDeals: number;
  totalViews: number;
  totalRedemptions: number;
  totalLikes: number;
}

export interface ReactionResponse {
  dealId: string;
  userReaction: string | null;
  likeCount: number;
  dislikeCount: number;
}

// ── Discovery API (public) ──

export const discoverDeals = async (
  params: DiscoverDealsParams
): Promise<PageResponse<DiscoveryDealResponse>> => {
  const queryParams: Record<string, string | number> = {
    latitude: params.latitude,
    longitude: params.longitude,
  };
  if (params.radius != null) queryParams.radius = params.radius;
  if (params.q) queryParams.q = params.q;
  if (params.category) queryParams.category = params.category;
  if (params.subcategory) queryParams.subcategory = params.subcategory;
  if (params.postType) queryParams.postType = params.postType;
  if (params.dealType) queryParams.dealType = params.dealType;
  if (params.fulfillmentMode) queryParams.fulfillmentMode = params.fulfillmentMode;
  if (params.tags && params.tags.length > 0) queryParams.tags = params.tags.join(",");
  if (params.page != null) queryParams.page = params.page;
  if (params.size != null) queryParams.size = params.size;
  if (params.sort) queryParams.sort = params.sort;

  const res = await api.get<ApiResponse<PageResponse<DiscoveryDealResponse>>>(
    "/api/v1/discovery/deals",
    { params: queryParams }
  );
  return res.data.data;
};

// ── Deal management API (authenticated) ──

export const createDeal = async (
  data: CreateDealRequest
): Promise<DealResponse> => {
  const res = await api.post<ApiResponse<DealResponse>>(
    "/api/v1/deals",
    data
  );
  return res.data.data;
};

export const uploadDealMedia = async (
  dealId: string,
  file: File
): Promise<DealResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<ApiResponse<DealResponse>>(
    `/api/v1/deals/${dealId}/media`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data.data;
};

export const getMyDeals = async (
  state?: string,
  search?: string,
  page = 0,
  size = 20
): Promise<PageResponse<DealResponse>> => {
  const params: Record<string, string | number> = { page, size };
  if (state) params.state = state;
  if (search) params.search = search;

  const res = await api.get<ApiResponse<PageResponse<DealResponse>>>(
    "/api/v1/deals",
    { params }
  );
  return res.data.data;
};

export const getDealById = async (dealId: string): Promise<DealResponse> => {
  const res = await api.get<ApiResponse<DealResponse>>(
    `/api/v1/deals/${dealId}`
  );
  return res.data.data;
};

export const deleteDeal = async (dealId: string): Promise<void> => {
  await api.delete<ApiResponse<void>>(`/api/v1/deals/${dealId}`);
};

export const getMyStats = async (): Promise<DealStatsResponse> => {
  const res = await api.get<ApiResponse<DealStatsResponse>>(
    "/api/v1/deals/my-stats"
  );
  return res.data.data;
};

// ── Reaction API (authenticated) ──

export const toggleReaction = async (
  dealId: string,
  type: "LIKE" | "DISLIKE"
): Promise<ReactionResponse> => {
  const res = await api.post<ApiResponse<ReactionResponse>>(
    `/api/v1/deals/${dealId}/reactions`,
    { type }
  );
  return res.data.data;
};

export const getReactionState = async (
  dealId: string
): Promise<ReactionResponse> => {
  const res = await api.get<ApiResponse<ReactionResponse>>(
    `/api/v1/deals/${dealId}/reactions`
  );
  return res.data.data;
};
