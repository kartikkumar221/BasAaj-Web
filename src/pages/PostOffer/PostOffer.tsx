import { useState, useRef, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import PhoneIcon from "@mui/icons-material/Phone";
import HomeIcon from "@mui/icons-material/Home";
import WorkIcon from "@mui/icons-material/Work";
import PlaceIcon from "@mui/icons-material/Place";
import { useTheme } from "@mui/material/styles";
import { useLocation } from "../../context/LocationContext";
import { useNavigate, useLocation as useRouteLocation } from "react-router-dom";
import type { OfferFormData, MediaFileItem } from "./types";
import { mediaFileRegistry } from "./mediaRegistry";
import {
  getAllFormConfigs,
  getAllSubCategories,
  type OfferFormConfig,
  type FormFieldConfig,
  type SubCategoryDto,
} from "../../services/formConfigService";
import { LocationSearchField } from "../../components/common";
import type { PlaceResult } from "../../components/common/LocationSearchField";
import { getRecentActivity, type SavedAddressDto } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";

const RECENT_CATEGORIES_KEY = "basaaj_recent_categories";

const OFFER_TYPES = [
  { value: "DEAL", label: "Deal" },
  { value: "LAST_MINUTE", label: "Last Minute" },
  { value: "ANNOUNCEMENT", label: "Announcement" },
] as const;

const categoryFilterOptions = createFilterOptions<SubCategoryDto>({
  stringify: (option) => `${option.name} ${option.parentCategory}`,
});

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const PostOffer = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { location } = useLocation();
  const { isLoggedIn } = useAuth();
  const routeState = useRouteLocation().state as OfferFormData | null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Form config state ──
  const [configs, setConfigs] = useState<OfferFormConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(true);

  // ── Subcategory state ──
  const [subCategories, setSubCategories] = useState<SubCategoryDto[]>([]);
  const [subCatLoading, setSubCatLoading] = useState(true);
  const [selectedSubCategory, setSelectedSubCategory] =
    useState<SubCategoryDto | null>(null);
  const [recentCategories, setRecentCategories] = useState<SubCategoryDto[]>(
    () => {
      try {
        const stored = localStorage.getItem(RECENT_CATEGORIES_KEY);
        return stored ? (JSON.parse(stored) as SubCategoryDto[]) : [];
      } catch {
        return [];
      }
    }
  );

  // ── Media state ──
  const [mediaItems, setMediaItems] = useState<MediaFileItem[]>(
    routeState?.mediaFiles ?? []
  );

  // ── Form field state ──
  const [title, setTitle] = useState(routeState?.title ?? "");
  const [category, setCategory] = useState(routeState?.category ?? "");
  const [offerType, setOfferType] = useState(routeState?.offerType ?? "DEAL");
  const [description, setDescription] = useState(
    routeState?.description ?? ""
  );
  const [originalPrice, setOriginalPrice] = useState(
    routeState?.originalPrice ?? ""
  );
  const [offerPrice, setOfferPrice] = useState(routeState?.offerPrice ?? "");
  const [startDate, setStartDate] = useState(routeState?.startDate ?? "");
  const [endDate, setEndDate] = useState(routeState?.endDate ?? "");
  const [fulfillment, setFulfillment] = useState<"walkin" | "delivery">(
    routeState?.fulfillment ?? "walkin"
  );
  const [contactNumber, setContactNumber] = useState(
    routeState?.contactNumber ?? ""
  );
  const [deliveryRadius, setDeliveryRadius] = useState(
    routeState?.deliveryRadius ?? "3"
  );
  const [outletLocation, setOutletLocation] = useState(
    routeState?.outletLocation ?? location?.displayName ?? ""
  );
  const [outletLat, setOutletLat] = useState<number | undefined>(
    routeState?.outletLat
  );
  const [outletLng, setOutletLng] = useState<number | undefined>(
    routeState?.outletLng
  );
  const [outletPlaceId, setOutletPlaceId] = useState<string | undefined>(
    routeState?.outletPlaceId
  );
  const [outletCity, setOutletCity] = useState<string | undefined>(
    routeState?.outletCity
  );
  const [outletRegion, setOutletRegion] = useState<string | undefined>(
    routeState?.outletRegion
  );
  const [outletCountry, setOutletCountry] = useState<string | undefined>(
    routeState?.outletCountry
  );

  // ── Fetch form configs + subcategories in parallel on mount ──
  useEffect(() => {
    let cancelled = false;

    const fetchConfigs = async () => {
      try {
        const res = await getAllFormConfigs();
        if (!cancelled) setConfigs(res.configurations);
      } catch {
        // fallback to defaults
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    };

    const fetchSubCategories = async () => {
      try {
        const data = await getAllSubCategories();
        if (!cancelled) setSubCategories(data);
      } catch {
        // leave empty
      } finally {
        if (!cancelled) setSubCatLoading(false);
      }
    };

    fetchConfigs();
    fetchSubCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore selectedSubCategory when returning from ReviewOffer
  useEffect(() => {
    if (subCategories.length > 0 && routeState?.category && !selectedSubCategory) {
      const found = subCategories.find((s) => s.code === routeState.category);
      if (found) setSelectedSubCategory(found);
    }
  }, [subCategories]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived: active config ──
  const activeConfig = useMemo(() => {
    if (!category || !offerType || configs.length === 0) return null;
    return (
      configs.find((c) => c.category === category && c.offerType === offerType) ??
      null
    );
  }, [category, offerType, configs]);

  const fieldMap = useMemo(() => {
    const map = new Map<string, FormFieldConfig>();
    if (activeConfig?.fields) {
      for (const f of activeConfig.fields) map.set(f.name, f);
    }
    return map;
  }, [activeConfig]);

  const isVisible = (name: string, fallback = true) =>
    fieldMap.get(name)?.visible ?? fallback;
  const isRequired = (name: string, fallback = false) =>
    fieldMap.get(name)?.required ?? fallback;
  const getMaxLength = (name: string) =>
    fieldMap.get(name)?.maxLength ?? undefined;

  // ── Validation errors ──
  const [errors, setErrors] = useState<{ endDate?: string }>({});

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (endDate && val && new Date(endDate) <= new Date(val)) {
      setErrors((prev) => ({ ...prev, endDate: "End date must be after start date" }));
    } else {
      setErrors((prev) => ({ ...prev, endDate: undefined }));
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val && new Date(val) <= new Date(startDate)) {
      setErrors((prev) => ({ ...prev, endDate: "End date must be after start date" }));
    } else {
      setErrors((prev) => ({ ...prev, endDate: undefined }));
    }
  };

  // ── Media handlers ──
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file
    if (files.length === 0) return;

    const newItems: MediaFileItem[] = files.map((file) => {
      const id = generateId();
      const type: "image" | "video" = file.type.startsWith("video/")
        ? "video"
        : "image";
      const previewUrl = URL.createObjectURL(file);
      mediaFileRegistry.set(id, file);
      return { id, type, name: file.name, previewUrl };
    });

    setMediaItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveMedia = (id: string) => {
    setMediaItems((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      mediaFileRegistry.delete(id);
      return prev.filter((m) => m.id !== id);
    });
  };

  // ── Other handlers ──
  const handleCategoryChange = (newValue: SubCategoryDto | null) => {
    setSelectedSubCategory(newValue);
    setCategory(newValue?.code ?? "");
    if (newValue) {
      const updated = [
        newValue,
        ...recentCategories.filter((r) => r.code !== newValue.code),
      ].slice(0, 5);
      setRecentCategories(updated);
      try {
        localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
    }
  };

  // ── Saved addresses (fetched from backend) ──
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressDto[]>([]);

  useEffect(() => {
    if (!isLoggedIn) return;
    getRecentActivity()
      .then((activity) => setSavedAddresses(activity.savedAddresses ?? []))
      .catch(() => { /* silently ignore */ });
  }, [isLoggedIn]);

  const getAddressIcon = (label: string) => {
    if (label === "Home") return <HomeIcon sx={{ fontSize: 16 }} />;
    if (label === "Work") return <WorkIcon sx={{ fontSize: 16 }} />;
    return <PlaceIcon sx={{ fontSize: 16 }} />;
  };

  const handleSelectSavedAddress = (addr: SavedAddressDto) => {
    setOutletLocation(addr.address);
    setOutletLat(addr.latitude);
    setOutletLng(addr.longitude);
    setOutletPlaceId(undefined);
    setOutletCity(undefined);
    setOutletRegion(undefined);
    setOutletCountry(undefined);
  };

  const handlePlaceSelected = (place: PlaceResult) => {
    setOutletLocation(place.displayName);
    setOutletLat(place.lat);
    setOutletLng(place.lng);
    setOutletPlaceId(place.placeId);
    setOutletCity(place.city);
    setOutletRegion(place.region);
    setOutletCountry(place.country);
  };

  const handleReviewOffer = () => {
    const newErrors: { endDate?: string } = {};
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      newErrors.endDate = "End date must be after start date";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formData: OfferFormData = {
      mediaFiles: mediaItems,
      title,
      category,
      offerType,
      description,
      originalPrice,
      offerPrice,
      startDate,
      endDate,
      fulfillment,
      contactNumber,
      deliveryRadius,
      outletLocation,
      outletLat,
      outletLng,
      outletPlaceId,
      outletCity,
      outletRegion,
      outletCountry,
    };
    navigate("/review-offer", { state: formData });
  };

  const discount =
    originalPrice && offerPrice
      ? Math.round(
          ((parseFloat(originalPrice) - parseFloat(offerPrice)) /
            parseFloat(originalPrice)) *
            100
        )
      : 0;

  const locationDisplay = location?.displayName || "your area";

  const photoCount = mediaItems.filter((m) => m.type === "image").length;
  const videoCount = mediaItems.filter((m) => m.type === "video").length;

  if (configLoading || subCatLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress sx={{ color: theme.palette.secondary.main }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 720,
        mx: "auto",
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 4 },
      }}
    >
      {/* Page header */}
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 0.5 }}
      >
        Create New Offer
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: theme.palette.text.secondary, mb: 4 }}
      >
        Fill in the details below to post your offer to customers in{" "}
        {locationDisplay}.
      </Typography>

      {/* ── Offer Media ── */}
      <SectionLabel label="Offer Media" />

      {/* Hidden file input — accepts images + videos, multiple */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={handleMediaUpload}
      />

      {mediaItems.length === 0 ? (
        /* Empty drop-zone */
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: `2px dashed ${theme.palette.grey[300]}`,
            borderRadius: 2,
            py: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            mb: 4,
            backgroundColor: theme.palette.grey[50],
            "&:hover": { borderColor: theme.palette.secondary.main },
          }}
        >
          <CameraAltOutlinedIcon
            sx={{ fontSize: 36, color: theme.palette.text.disabled, mb: 1 }}
          />
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: theme.palette.text.primary }}
          >
            Click to upload photos or video
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, mt: 0.5 }}
          >
            Photos: JPG, PNG, GIF &nbsp;•&nbsp; Video: MP4, MOV
          </Typography>
        </Box>
      ) : (
        /* Thumbnail grid */
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1.5,
              mb: 1.5,
            }}
          >
            {mediaItems.map((item) => (
              <Box
                key={item.id}
                sx={{
                  position: "relative",
                  width: 110,
                  height: 82,
                  borderRadius: 1.5,
                  overflow: "visible",
                  flexShrink: 0,
                }}
              >
                {item.type === "image" ? (
                  <Box
                    component="img"
                    src={item.previewUrl}
                    alt={item.name}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 1.5,
                      display: "block",
                    }}
                  />
                ) : (
                  /* Video placeholder */
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 1.5,
                      backgroundColor: theme.palette.grey[200],
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.5,
                      px: 0.5,
                    }}
                  >
                    <MovieOutlinedIcon
                      sx={{
                        fontSize: 28,
                        color: theme.palette.text.secondary,
                      }}
                    />
                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        fontSize: "0.65rem",
                        color: theme.palette.text.secondary,
                        maxWidth: 96,
                      }}
                    >
                      {item.name}
                    </Typography>
                  </Box>
                )}

                {/* Remove button */}
                <IconButton
                  size="small"
                  onClick={() => handleRemoveMedia(item.id)}
                  sx={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    width: 22,
                    height: 22,
                    backgroundColor: theme.palette.grey[800],
                    color: "#fff",
                    "&:hover": { backgroundColor: theme.palette.error.main },
                    zIndex: 1,
                  }}
                >
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Box>
            ))}

            {/* Add more slot */}
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                width: 110,
                height: 82,
                border: `2px dashed ${theme.palette.grey[300]}`,
                borderRadius: 1.5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                gap: 0.5,
                flexShrink: 0,
                "&:hover": { borderColor: theme.palette.secondary.main },
              }}
            >
              <AddCircleOutlineIcon
                sx={{ fontSize: 24, color: theme.palette.text.secondary }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.7rem",
                  color: theme.palette.text.secondary,
                }}
              >
                Add more
              </Typography>
            </Box>
          </Box>

          {/* Media count summary */}
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary }}
          >
            {photoCount > 0 && `${photoCount} photo${photoCount > 1 ? "s" : ""}`}
            {photoCount > 0 && videoCount > 0 && " · "}
            {videoCount > 0 && `${videoCount} video${videoCount > 1 ? "s" : ""}`}
          </Typography>
        </Box>
      )}

      {/* ── Offer Details ── */}
      <SectionLabel label="Offer Details" />
      {isVisible("title") && (
        <>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: theme.palette.text.primary, mb: 0.5 }}
          >
            Offer Title{isRequired("title", true) ? " *" : ""}
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="e.g. Flat 50% OFF on Lunch Buffet"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required={isRequired("title", true)}
            inputProps={{ maxLength: 40 }}
            helperText={
              <Box component="span" sx={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ color: title.length >= 40 ? "red" : undefined }}>
                  {title.length}/40
                </span>
              </Box>
            }
            sx={{ mb: 2.5 }}
          />
        </>
      )}

      {/* ── Category with search ── */}
      <Box sx={{ mb: 2.5 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: theme.palette.text.primary, mb: 0.5 }}
        >
          Category *
        </Typography>
        <Autocomplete
          options={subCategories}
          getOptionLabel={(option) => option.name}
          filterOptions={categoryFilterOptions}
          value={selectedSubCategory}
          onChange={(_, newValue) => handleCategoryChange(newValue)}
          size="small"
          isOptionEqualToValue={(option, value) => option.code === value.code}
          noOptionsText="No subcategory found"
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search subcategory..."
              size="small"
            />
          )}
          renderOption={(props, option) => {
            const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & {
              key: React.Key;
            };
            return (
              <Box component="li" key={key} {...rest} sx={{ py: 0.75 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {option.name}
                </Typography>
              </Box>
            );
          }}
        />

        {/* Recent categories */}
        {recentCategories.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary }}
            >
              Recent:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
              {recentCategories.map((cat) => {
                const isSelected = selectedSubCategory?.code === cat.code;
                return (
                  <Chip
                    key={cat.code}
                    label={cat.name}
                    size="small"
                    onClick={() => handleCategoryChange(cat)}
                    variant={isSelected ? "filled" : "outlined"}
                    sx={{
                      cursor: "pointer",
                      fontSize: "0.7rem",
                      height: 22,
                      ...(isSelected && {
                        backgroundColor: theme.palette.secondary.main,
                        color: "#fff",
                        borderColor: theme.palette.secondary.main,
                        "&:hover": {
                          backgroundColor: theme.palette.secondary.dark,
                        },
                      }),
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </Box>

      {/* Config description hint */}
      {activeConfig?.description && (
        <Typography
          variant="caption"
          sx={{ color: theme.palette.text.secondary, mb: 2, display: "block" }}
        >
          {activeConfig.description}
        </Typography>
      )}

      {isVisible("description") && (
        <>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: theme.palette.text.primary, mb: 0.5 }}
          >
            Description{isRequired("description") ? " *" : ""}
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            multiline
            rows={3}
            placeholder="Describe what's included in this offer..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required={isRequired("description")}
            inputProps={{ maxLength: 500 }}
            helperText={
              <Box component="span" sx={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ color: description.length >= 500 ? "red" : undefined }}>
                  {description.length}/500
                </span>
              </Box>
            }
            sx={{ mb: 4 }}
          />
        </>
      )}

      {/* ── Pricing & Validity ── */}
      <SectionLabel label="Pricing & Validity" />

      {/* Offer Type */}
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, color: theme.palette.text.primary, mb: 0.5 }}
      >
        Offer Type *
      </Typography>
      <ToggleButtonGroup
        value={offerType}
        exclusive
        onChange={(_, val) => val && setOfferType(val)}
        size="small"
        sx={{ mb: 2.5 }}
      >
        {OFFER_TYPES.map((t) => (
          <ToggleButton
            key={t.value}
            value={t.value}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              "&.Mui-selected": {
                backgroundColor: theme.palette.text.primary,
                color: theme.palette.common.white,
                "&:hover": { backgroundColor: theme.palette.grey[800] },
              },
            }}
          >
            {t.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Price fields */}
      {(isVisible("originalPrice") || isVisible("dealPrice")) && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 1,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          {isVisible("originalPrice") && (
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  mb: 0.5,
                }}
              >
                Original Price ({"\u20B9"}){isRequired("originalPrice") ? " *" : ""}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                placeholder="0.00"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                required={isRequired("originalPrice")}
              />
            </Box>
          )}
          {isVisible("dealPrice") && (
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  mb: 0.5,
                }}
              >
                Offer Price ({"\u20B9"}){isRequired("dealPrice") ? " *" : ""}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                placeholder="0.00"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                required={isRequired("dealPrice")}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderColor:
                      discount > 0
                        ? theme.palette.secondary.main
                        : undefined,
                  },
                }}
              />
              {discount > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.success.main,
                    mt: 0.5,
                    display: "block",
                  }}
                >
                  You are offering a {discount}% discount
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Start / End dates */}
      {(isVisible("startTime") || isVisible("expiryTime")) && (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 4,
            mt: 2,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          {isVisible("startTime") && (
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  mb: 0.5,
                }}
              >
                Start Date & Time{isRequired("startTime") ? " *" : ""}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required={isRequired("startTime")}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          )}
          {isVisible("expiryTime") && (
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  mb: 0.5,
                }}
              >
                End Date & Time{isRequired("expiryTime") ? " *" : ""}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                required={isRequired("expiryTime")}
                error={!!errors.endDate}
                helperText={errors.endDate}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          )}
        </Box>
      )}

      {/* ── How to Redeem ── */}
      {isVisible("fulfillmentModes") && (
        <>
          <SectionLabel label="How to Redeem" />
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: theme.palette.text.primary, mb: 1 }}
          >
            Fulfillment Method{isRequired("fulfillmentModes") ? " *" : ""}
          </Typography>
          <ToggleButtonGroup
            value={fulfillment}
            exclusive
            onChange={(_, val) => val && setFulfillment(val)}
            size="small"
            sx={{ mb: 2.5 }}
          >
            <ToggleButton
              value="walkin"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                "&.Mui-selected": {
                  backgroundColor: theme.palette.text.primary,
                  color: theme.palette.common.white,
                  "&:hover": { backgroundColor: theme.palette.grey[800] },
                },
              }}
            >
              Walk-in Only
            </ToggleButton>
            <ToggleButton
              value="delivery"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                "&.Mui-selected": {
                  backgroundColor: theme.palette.text.primary,
                  color: theme.palette.common.white,
                  "&:hover": { backgroundColor: theme.palette.grey[800] },
                },
              }}
            >
              Delivery Available
            </ToggleButton>
          </ToggleButtonGroup>

          {fulfillment === "delivery" && (
            <Box
              sx={{
                display: "flex",
                gap: 2,
                mb: 4,
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              {isVisible("contactPhone") && (
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      mb: 0.5,
                    }}
                  >
                    Contact Number{isRequired("contactPhone") ? " *" : ""}
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="+91 98765 43210"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required={isRequired("contactPhone")}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon
                              sx={{
                                fontSize: 18,
                                color: theme.palette.secondary.main,
                              }}
                            />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>
              )}
              {isVisible("deliveryRadiusKm") && (
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      mb: 0.5,
                    }}
                  >
                    Delivery Radius (km){isRequired("deliveryRadiusKm") ? " *" : ""}
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={deliveryRadius}
                    onChange={(e) => setDeliveryRadius(e.target.value)}
                    required={isRequired("deliveryRadiusKm")}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <Typography
                              variant="caption"
                              sx={{ color: theme.palette.text.secondary }}
                            >
                              km
                            </Typography>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </>
      )}

      {/* ── Location ── */}
      {isVisible("location") && (
        <>
          <SectionLabel label="Location" />
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: theme.palette.text.primary, mb: 0.5 }}
          >
            Outlet Location{isRequired("location") ? " *" : ""}
          </Typography>
          <Box sx={{ mb: 4 }}>
            {/* Saved address quick-select */}
            {savedAddresses.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.text.secondary, fontWeight: 600, display: "block", mb: 0.75 }}
                >
                  Saved Addresses
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {savedAddresses.map((addr) => {
                    const isSelected = outletLocation === addr.address;
                    return (
                      <Box
                        key={addr.id}
                        onClick={() => handleSelectSavedAddress(addr)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 2,
                          cursor: "pointer",
                          border: `1.5px solid ${isSelected ? theme.palette.secondary.main : theme.palette.divider}`,
                          backgroundColor: isSelected ? `${theme.palette.secondary.main}10` : "transparent",
                          transition: "all 0.15s",
                          "&:hover": {
                            borderColor: theme.palette.secondary.main,
                            backgroundColor: `${theme.palette.secondary.main}08`,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            color: isSelected ? theme.palette.secondary.main : theme.palette.text.secondary,
                            display: "flex",
                          }}
                        >
                          {getAddressIcon(addr.label)}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: isSelected ? theme.palette.secondary.main : theme.palette.text.primary,
                              display: "block",
                              lineHeight: 1.2,
                            }}
                          >
                            {addr.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            noWrap
                            sx={{
                              color: theme.palette.text.secondary,
                              fontSize: "0.7rem",
                              display: "block",
                              maxWidth: 160,
                            }}
                          >
                            {addr.address}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            <LocationSearchField
              value={outletLocation}
              onChange={handlePlaceSelected}
              placeholder="Search for your outlet location"
            />
          </Box>
        </>
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
          variant="text"
          onClick={() => navigate("/")}
          sx={{
            color: theme.palette.text.secondary,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleReviewOffer}
          sx={{
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.common.white,
            textTransform: "none",
            fontWeight: 700,
            px: 3,
            "&:hover": { backgroundColor: theme.palette.secondary.dark },
          }}
        >
          Review Offer
        </Button>
      </Box>
    </Box>
  );
};

const SectionLabel = ({ label }: { label: string }) => {
  const theme = useTheme();
  return (
    <Typography
      variant="h6"
      sx={{
        fontWeight: 700,
        color: theme.palette.text.primary,
        mb: 2,
        mt: 1,
        fontSize: "1rem",
      }}
    >
      {label}
    </Typography>
  );
};

export default PostOffer;
