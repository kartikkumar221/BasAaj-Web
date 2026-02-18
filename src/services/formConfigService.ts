import api from "./api";
import type { ApiResponse } from "./authService";

// ── Subcategory ──

export interface SubCategoryDto {
  id: string;
  code: string;
  name: string;
  nameHi?: string;
  parentCode: string;
  parentCategory: string;
  isCustom: boolean;
}

// ── Form field config ──

export interface FormFieldConfig {
  name: string;
  required: boolean;
  visible: boolean;
  maxLength?: number;
  min?: number;
  validation?: string;
}

export interface FormConstraints {
  maxExpiryHours?: number;
  requiresQuantity?: boolean;
  minDiscountPercent?: number;
  maxDurationHours?: number;
  requiresSlots?: boolean;
  minBundleItems?: number;
}

export interface OfferFormConfig {
  category: string;
  offerType: string;
  displayName: string;
  description?: string;
  cardPriority?: string[];
  requiresDetailView?: boolean;
  fields: FormFieldConfig[];
  constraints?: FormConstraints;
}

// ── Full response ──

export interface FormConfigResponse {
  version: string;
  description?: string;
  configurations: OfferFormConfig[];
  bundleTypes?: unknown[];
  cardActions?: Record<string, unknown>;
}

// ── Media upload guidelines ──

export interface ImageGuidelines {
  format: string;
  maxSizeBytes: number;
  maxSizeDisplay: string;
  maxDimensionPx: number;
  qualityPercent: number;
  allowedMimeTypes: string[];
}

export interface VideoGuidelines {
  format: string;
  codec: string;
  maxSizeBytes: number;
  maxSizeDisplay: string;
  maxResolution: string;
  maxDurationSeconds: number;
  allowedMimeTypes: string[];
}

export interface MediaUploadGuidelines {
  image: ImageGuidelines;
  video: VideoGuidelines;
}

// ── API calls ──

// Module-level cache so multiple components share one network request
let _subCatCache: Promise<SubCategoryDto[]> | null = null;

export const getAllSubCategories = (): Promise<SubCategoryDto[]> => {
  if (!_subCatCache) {
    _subCatCache = api
      .get<ApiResponse<SubCategoryDto[]>>("/api/v1/categories")
      .then((res) => res.data.data)
      .catch((err) => {
        _subCatCache = null; // allow retry on error
        return Promise.reject(err);
      });
  }
  return _subCatCache;
};

export const getAllFormConfigs = async (): Promise<FormConfigResponse> => {
  const res = await api.get<ApiResponse<FormConfigResponse>>(
    "/api/v1/offers/form-config"
  );
  return res.data.data;
};

export const getFormConfigsByCategory = async (
  category: string
): Promise<OfferFormConfig[]> => {
  const res = await api.get<ApiResponse<OfferFormConfig[]>>(
    `/api/v1/offers/form-config/${encodeURIComponent(category)}`
  );
  return res.data.data;
};

export const getFormConfig = async (
  category: string,
  offerType: string
): Promise<OfferFormConfig> => {
  const res = await api.get<ApiResponse<OfferFormConfig>>(
    `/api/v1/offers/form-config/${encodeURIComponent(category)}/${encodeURIComponent(offerType)}`
  );
  return res.data.data;
};

export const getMediaUploadGuidelines = async (): Promise<MediaUploadGuidelines> => {
  const res = await api.get<ApiResponse<MediaUploadGuidelines>>(
    "/api/v1/media/upload-guidelines"
  );
  return res.data.data;
};
