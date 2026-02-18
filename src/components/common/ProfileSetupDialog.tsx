import { useState, useRef, useEffect, useCallback } from "react";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import { useTheme } from "@mui/material/styles";
import { AppText } from "../../constants";
import { AppButton } from "./index";
import { useLocation, type LocationData } from "../../context/LocationContext";
import type { UserProfile } from "../../context/AuthContext";
import { loadGoogleMaps } from "../../utils/googleMaps";

interface ProfileSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: (profile: Pick<UserProfile, "businessName" | "profileImage" | "location">, profileFile?: File | null) => Promise<void>;
  initialData?: Pick<UserProfile, "businessName" | "profileImage" | "location"> | null;
}

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

const ProfileSetupDialog = ({ open, onClose, onComplete, initialData }: ProfileSetupDialogProps) => {
  const theme = useTheme();
  const { location } = useLocation();

  const [businessName, setBusinessName] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);

  // Pre-fill data when dialog opens
  useEffect(() => {
    if (open) {
      setBusinessName(initialData?.businessName || "");
      setProfileImage(initialData?.profileImage || null);
      setProfileFile(null);
      setSelectedLocation(initialData?.location || location);
      setEditingLocation(false);
      setLocationQuery("");
      setPredictions([]);
      setError("");
    }
  }, [open, location, initialData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfileImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getAutocompleteService = useCallback(async () => {
    if (autocompleteRef.current) return autocompleteRef.current;
    await loadGoogleMaps();
    autocompleteRef.current = new google.maps.places.AutocompleteService();
    return autocompleteRef.current;
  }, []);

  // Location search with debounce
  useEffect(() => {
    if (!locationQuery.trim()) {
      setPredictions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const service = await getAutocompleteService();
        service.getPlacePredictions(
          { input: locationQuery, types: ["(cities)"] },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              setPredictions(
                results.slice(0, 4).map((r) => ({
                  placeId: r.place_id,
                  mainText: r.structured_formatting.main_text,
                  secondaryText: r.structured_formatting.secondary_text,
                }))
              );
            } else {
              setPredictions([]);
            }
            setSearching(false);
          }
        );
      } catch {
        setPredictions([]);
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [locationQuery, getAutocompleteService]);

  const handleSelectPrediction = async (prediction: Prediction) => {
    await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.placeId }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const result = results[0];
        const components = result.address_components;
        const city =
          components.find((c) => c.types.includes("locality"))?.long_name ||
          components.find((c) => c.types.includes("administrative_area_level_2"))?.long_name ||
          prediction.mainText;
        const region =
          components.find((c) => c.types.includes("administrative_area_level_1"))?.long_name || "";
        const country =
          components.find((c) => c.types.includes("country"))?.long_name || "";

        setSelectedLocation({
          city,
          region,
          country,
          displayName: `${city}, ${country}`,
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          placeId: prediction.placeId,
        });
      }
      setEditingLocation(false);
      setLocationQuery("");
      setPredictions([]);
    });
  };

  const isValid = businessName.trim().length > 0 && selectedLocation !== null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
          minHeight: 450,
          width: { xs: "95vw", sm: 680 },
        },
      }}
    >
      {/* Left branded panel */}
      <Box
        sx={{
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.palette.secondary.main,
          width: 260,
          flexShrink: 0,
          px: 4,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 2,
            backgroundColor: theme.palette.common.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 1.5,
          }}
        >
          <Typography
            sx={{
              color: theme.palette.secondary.main,
              fontWeight: 700,
              fontSize: "2rem",
            }}
          >
            B
          </Typography>
        </Box>
        <Typography
          variant="h6"
          sx={{ color: theme.palette.common.white, fontWeight: 700, mb: 2 }}
        >
          {AppText.app.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.common.white, opacity: 0.9, lineHeight: 1.6 }}
        >
          {AppText.login.brandTagline}
        </Typography>
      </Box>

      {/* Right form panel */}
      <Box sx={{ flexGrow: 1, position: "relative", p: { xs: 3, sm: 4 } }}>
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 12, right: 12 }}
          size="small"
        >
          <CloseIcon />
        </IconButton>

        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 0.5, mt: 1 }}
        >
          {AppText.profileSetup.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.secondary, mb: 3 }}
        >
          {AppText.profileSetup.subtitle}
        </Typography>

        {/* Profile image upload */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: `2px dashed ${theme.palette.grey[300]}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              overflow: "hidden",
              flexShrink: 0,
              backgroundColor: theme.palette.grey[50],
              "&:hover": { borderColor: theme.palette.secondary.main },
            }}
          >
            {profileImage ? (
              <Box
                component="img"
                src={profileImage}
                alt="Profile"
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <CameraAltIcon sx={{ color: theme.palette.grey[400], fontSize: 28 }} />
            )}
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              {AppText.profileSetup.profileImage}
            </Typography>
            <Typography
              variant="body2"
              onClick={() => fileInputRef.current?.click()}
              sx={{
                color: theme.palette.secondary.main,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.8rem",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {profileImage ? AppText.profileSetup.changeImage : AppText.profileSetup.uploadImage}
            </Typography>
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageUpload}
          />
        </Box>

        {/* Business name */}
        <TextField
          fullWidth
          variant="standard"
          label={AppText.profileSetup.businessNameLabel}
          placeholder={AppText.profileSetup.businessNamePlaceholder}
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          sx={{ mb: 3 }}
        />

        {/* Location */}
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 1, fontSize: "0.75rem" }}
        >
          {AppText.profileSetup.locationLabel}
        </Typography>

        {editingLocation ? (
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1.5,
                px: 1.5,
                py: 0.5,
                mb: 1,
                "&:focus-within": { borderColor: theme.palette.secondary.main },
              }}
            >
              <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 1, fontSize: 20 }} />
              <InputBase
                placeholder={AppText.location.searchPlaceholder}
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                sx={{ width: "100%", fontSize: "0.85rem" }}
                autoFocus
              />
              {searching && <CircularProgress size={16} />}
            </Box>
            {predictions.length > 0 && (
              <List
                disablePadding
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1.5,
                  overflow: "hidden",
                }}
              >
                {predictions.map((p) => (
                  <ListItemButton
                    key={p.placeId}
                    onClick={() => handleSelectPrediction(p)}
                    sx={{ px: 2, py: 0.75 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <LocationOnIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={p.mainText}
                      secondary={p.secondaryText}
                      primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}
                      secondaryTypographyProps={{ fontSize: "0.75rem" }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1.5,
              px: 2,
              py: 1.5,
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LocationOnIcon sx={{ color: theme.palette.secondary.main, fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                {selectedLocation?.displayName || AppText.navbar.defaultLocation}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setEditingLocation(true)}
              sx={{ color: theme.palette.secondary.main }}
            >
              <EditIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        )}

        {error && (
          <Typography
            variant="body2"
            sx={{ color: theme.palette.error.main, mb: 2 }}
          >
            {error}
          </Typography>
        )}

        {/* Continue button */}
        <AppButton
          label={loading ? "" : AppText.profileSetup.done}
          fullWidth
          disabled={!isValid || loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
          onClick={async () => {
            setLoading(true);
            setError("");
            try {
              await onComplete(
                {
                  businessName: businessName.trim(),
                  profileImage,
                  location: selectedLocation,
                },
                profileFile
              );
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Something went wrong. Please try again."
              );
            } finally {
              setLoading(false);
            }
          }}
          sx={{
            backgroundColor: isValid && !loading
              ? theme.palette.secondary.main
              : theme.palette.grey[300],
            color: isValid && !loading
              ? theme.palette.common.white
              : theme.palette.text.disabled,
            py: 1.5,
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: 1,
            "&:hover": {
              backgroundColor: isValid && !loading
                ? theme.palette.secondary.dark
                : theme.palette.grey[300],
            },
            "&.Mui-disabled": {
              backgroundColor: theme.palette.grey[300],
              color: theme.palette.text.disabled,
            },
          }}
        />
      </Box>
    </Dialog>
  );
};

export default ProfileSetupDialog;
