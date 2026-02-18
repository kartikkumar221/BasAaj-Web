import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import EventIcon from "@mui/icons-material/Event";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation as useRouteLocation } from "react-router-dom";
import type { OfferFormData } from "./types";
import { AppText } from "../../constants";
import { AxiosError } from "axios";
import { createDeal, uploadDealMedia, type CreateDealRequest } from "../../services/dealService";
import { useLocation } from "../../context/LocationContext";
import { mediaFileRegistry } from "./mediaRegistry";

const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return "Not set";
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};


const ReviewOffer = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { state } = useRouteLocation();
  const { location: userLocation } = useLocation();
  const data = state as OfferFormData | null;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!data) {
    return (
      <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, md: 3 }, py: 6, textAlign: "center" }}>
        <Typography variant="h6" sx={{ color: theme.palette.text.secondary }}>
          No offer data found. Please create an offer first.
        </Typography>
        <Button
          onClick={() => navigate("/post-offer")}
          sx={{ mt: 2, color: theme.palette.secondary.main }}
        >
          Go to Post Offer
        </Button>
      </Box>
    );
  }

  const discount =
    data.originalPrice && data.offerPrice
      ? Math.round(
          ((parseFloat(data.originalPrice) - parseFloat(data.offerPrice)) /
            parseFloat(data.originalPrice)) *
            100
        )
      : 0;

  const OFFER_TYPE_LABELS: Record<string, string> = {
    DEAL: "Deal",
    LAST_MINUTE: "Last Minute",
    ANNOUNCEMENT: "Announcement",
  };
  const offerTypeLabel = OFFER_TYPE_LABELS[data.offerType] ?? data.offerType;
  const fulfillmentLabel =
    data.fulfillment === "delivery" ? "Walk-in & Delivery" : "Walk-in Only";

  const handlePostOffer = async () => {
    setSubmitting(true);
    setError("");

    try {
      // Map form data → CreateDealRequest
      const fulfillmentModes: string[] = ["WALK_IN"];
      if (data.fulfillment === "delivery") fulfillmentModes.push("DELIVERY");

      const origPrice = data.originalPrice ? parseFloat(data.originalPrice) : undefined;
      const dealPriceVal = data.offerPrice ? parseFloat(data.offerPrice) : undefined;

      // offerType is always DEAL, LAST_MINUTE, or ANNOUNCEMENT
      const postType = data.offerType;

      const dealRequest: CreateDealRequest = {
        postType,
        title: data.title,
        description: data.description || undefined,
        originalPrice: origPrice != null && !isNaN(origPrice) ? origPrice : undefined,
        dealPrice: dealPriceVal != null && !isNaN(dealPriceVal) ? dealPriceVal : undefined,
        discountValue: discount > 0 ? discount : undefined,
        subcategoryCode: data.category?.toUpperCase().replace(/\s+&\s+/g, "_").replace(/\s+/g, "_"),
        subcategoryName: data.category,
        location: data.outletLat != null && data.outletLng != null ? {
          latitude: data.outletLat,
          longitude: data.outletLng,
          address: data.outletLocation || undefined,
        } : userLocation ? {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          address: data.outletLocation || userLocation.displayName || undefined,
        } : undefined,
        fulfillmentModes,
        contactPhone: data.fulfillment === "delivery" ? data.contactNumber : undefined,
        deliveryRadiusKm: data.fulfillment === "delivery" ? (parseFloat(data.deliveryRadius) || undefined) : undefined,
        startTime: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        expiryTime: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      };

      console.log("[ReviewOffer] location payload:", JSON.stringify(dealRequest.location, null, 2));

      // Step 1: Create the deal
      const deal = await createDeal(dealRequest);

      // Step 2: Upload all selected media files
      for (const mediaItem of data.mediaFiles ?? []) {
        const file = mediaFileRegistry.get(mediaItem.id);
        if (file) {
          await uploadDealMedia(deal.id, file);
        }
      }

      navigate("/my-offers", { state: { success: true } });
    } catch (err) {
      let msg = "Failed to post offer. Please try again.";
      if (err instanceof AxiosError && err.response?.data) {
        const body = err.response.data;
        // Backend returns { error: { code, message } } or { message: "..." }
        if (body.error?.message) {
          msg = body.error.message;
        } else if (typeof body.message === "string") {
          msg = body.message;
        } else if (typeof body.error === "string") {
          msg = body.error;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 720,
        mx: "auto",
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 4 },
      }}
    >
      {/* Header */}
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 0.5 }}
      >
        Review Offer
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: theme.palette.text.secondary, mb: 4 }}
      >
        Check all the details below before posting your offer live on {AppText.app.name}.
      </Typography>

      {/* ── Offer Overview ── */}
      <SectionTitle label="Offer Overview" />
      <Box
        sx={{
          display: "flex",
          gap: 2,
          p: 2,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          mb: 3,
        }}
      >
        {data.mediaFiles?.[0]?.type === "image" && (
          <Box
            component="img"
            src={data.mediaFiles[0].previewUrl}
            alt={data.title}
            sx={{
              width: 100,
              height: 72,
              borderRadius: 1,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 0.25 }}
          >
            {data.title || "Untitled Offer"}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Category: {data.category || "N/A"} &bull; Offer Type: {offerTypeLabel}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            {data.originalPrice && (
              <Typography
                variant="body2"
                sx={{ color: theme.palette.text.disabled, textDecoration: "line-through" }}
              >
                {"\u20B9"}{data.originalPrice}
              </Typography>
            )}
            {data.offerPrice && (
              <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                {"\u20B9"}{data.offerPrice}
              </Typography>
            )}
            {discount > 0 && (
              <Typography
                variant="caption"
                sx={{ color: theme.palette.secondary.main, fontWeight: 700 }}
              >
                {discount}% OFF
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Media Preview ── */}
      {data.mediaFiles && data.mediaFiles.length > 0 && (
        <>
          <SectionTitle label="Media" />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3 }}>
            {data.mediaFiles.map((item) =>
              item.type === "image" ? (
                <Box
                  key={item.id}
                  component="img"
                  src={item.previewUrl}
                  alt={item.name}
                  sx={{
                    width: 160,
                    height: 110,
                    objectFit: "cover",
                    borderRadius: 1.5,
                    flexShrink: 0,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
              ) : (
                <Box
                  key={item.id}
                  sx={{
                    width: 280,
                    borderRadius: 1.5,
                    overflow: "hidden",
                    backgroundColor: theme.palette.grey[900],
                    flexShrink: 0,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <video
                    src={item.previewUrl}
                    controls
                    style={{ width: "100%", display: "block", maxHeight: 180 }}
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.5 }}>
                    <MovieOutlinedIcon sx={{ fontSize: 14, color: "#fff", flexShrink: 0 }} />
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{ color: "#fff", fontSize: "0.7rem" }}
                    >
                      {item.name}
                    </Typography>
                  </Box>
                </Box>
              )
            )}
          </Box>
          <Divider sx={{ mb: 3 }} />
        </>
      )}

      {/* ── Description ── */}
      {data.description && (
        <>
          <LabelText label="DESCRIPTION" />
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.primary, mb: 3, lineHeight: 1.7 }}
          >
            {data.description}
          </Typography>
        </>
      )}

      {/* Category / Offer Type row */}
      <Box sx={{ display: "flex", gap: 4, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <LabelText label="CATEGORY" />
          <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
            {data.category || "N/A"}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <LabelText label="OFFER TYPE" />
          <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
            {offerTypeLabel}
          </Typography>
        </Box>
      </Box>

      {/* Prices row */}
      <Box sx={{ display: "flex", gap: 4, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <LabelText label="ORIGINAL PRICE" />
          <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
            {data.originalPrice ? `\u20B9${data.originalPrice}` : "N/A"}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <LabelText label="OFFER PRICE" />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
              {data.offerPrice ? `\u20B9${data.offerPrice}` : "N/A"}
            </Typography>
            {discount > 0 && (
              <Typography
                variant="caption"
                sx={{ color: theme.palette.success.main, fontWeight: 600 }}
              >
                ({discount}% OFF)
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* ── Validity & Timing ── */}
      <SectionTitle label="Validity & Timing" />
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, fontWeight: 600, width: 40 }}
          >
            START
          </Typography>
          <EventIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
          <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
            {formatDateTime(data.startDate)}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, fontWeight: 600, width: 40 }}
          >
            END
          </Typography>
          <EventIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
          <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
            {formatDateTime(data.endDate)}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* ── Fulfilment Method ── */}
      <SectionTitle label="Fulfilment Method" />
      <Box sx={{ display: "flex", gap: 4, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <LabelText label="REDEMPTION" />
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FiberManualRecordIcon
              sx={{ fontSize: 10, color: theme.palette.secondary.main }}
            />
            <Typography variant="body2" sx={{ color: theme.palette.secondary.main, fontWeight: 500 }}>
              {fulfillmentLabel}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 1 }}>
          <LabelText label="FULFILMENT DETAILS" />
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.6 }}>
            Show {AppText.app.name} code at outlet or share code on phone for delivery orders.
          </Typography>
        </Box>
      </Box>

      {/* ── Delivery Settings (only if delivery) ── */}
      {data.fulfillment === "delivery" && (
        <>
          <Divider sx={{ mb: 3 }} />
          <SectionTitle label="Delivery Settings" />
          <Box sx={{ display: "flex", gap: 4, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <LabelText label="CONTACT NUMBER" />
              <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                {data.contactNumber || "N/A"}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <LabelText label="DELIVERY RADIUS" />
              <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                {data.deliveryRadius} km
              </Typography>
            </Box>
          </Box>
        </>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* ── Outlet Location ── */}
      <SectionTitle label="Outlet Location" />
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 0.5 }}>
        <LocationOnIcon
          sx={{ fontSize: 18, color: theme.palette.secondary.main, mt: 0.25 }}
        />
        <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontWeight: 500 }}>
          {data.outletLocation || "Not set"}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        sx={{ color: theme.palette.text.secondary, ml: 3.5, display: "block", mb: 4 }}
      >
        where customers will redeem the offer.
      </Typography>

      {/* Error message */}
      {error && (
        <Typography
          variant="body2"
          sx={{ color: theme.palette.error.main, mb: 2, textAlign: "center" }}
        >
          {error}
        </Typography>
      )}

      {/* ── Actions ── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          pt: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<EditOutlinedIcon />}
          onClick={() => navigate("/post-offer", { state: data })}
          disabled={submitting}
          sx={{
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Edit
        </Button>
        <Button
          variant="contained"
          onClick={handlePostOffer}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.common.white,
            textTransform: "none",
            fontWeight: 700,
            px: 3,
            "&:hover": { backgroundColor: theme.palette.secondary.dark },
          }}
        >
          {submitting ? "Posting..." : "Post Offer"}
        </Button>
      </Box>
    </Box>
  );
};

const SectionTitle = ({ label }: { label: string }) => {
  const theme = useTheme();
  return (
    <Typography
      variant="h6"
      sx={{
        fontWeight: 700,
        color: theme.palette.text.primary,
        mb: 2,
        fontSize: "1rem",
      }}
    >
      {label}
    </Typography>
  );
};

const LabelText = ({ label }: { label: string }) => {
  const theme = useTheme();
  return (
    <Typography
      variant="caption"
      sx={{
        color: theme.palette.text.secondary,
        fontWeight: 600,
        letterSpacing: 0.5,
        mb: 0.5,
        display: "block",
      }}
    >
      {label}
    </Typography>
  );
};

export default ReviewOffer;
