export interface MediaFileItem {
  id: string;
  type: "image" | "video";
  name: string;
  previewUrl: string; // object URL – valid for the lifetime of the SPA session
}

export interface OfferFormData {
  mediaFiles: MediaFileItem[];
  title: string;
  category: string;
  offerType: string;
  description: string;
  originalPrice: string;
  offerPrice: string;
  startDate: string;
  endDate: string;
  fulfillment: "walkin" | "delivery";
  contactNumber: string;
  deliveryRadius: string;
  outletLocation: string;
  outletLat?: number;
  outletLng?: number;
  outletPlaceId?: string;
  outletCity?: string;
  outletRegion?: string;
  outletCountry?: string;
}
