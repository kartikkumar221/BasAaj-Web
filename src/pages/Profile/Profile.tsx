import { useState, useRef, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import InputBase from "@mui/material/InputBase";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LogoutIcon from "@mui/icons-material/Logout";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { AppText } from "../../constants";
import { AppButton } from "../../components/common";
import { useAuth } from "../../context/AuthContext";
import { useLocation, type LocationData } from "../../context/LocationContext";
import { loadGoogleMaps } from "../../utils/googleMaps";

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

const LANG_KEY = "basaaj_language";

const Profile = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout, completeProfileSetup } = useAuth();
  const { location } = useLocation();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState(() => localStorage.getItem(LANG_KEY) || "en");
  const [signOutOpen, setSignOutOpen] = useState(false);

  // Editable fields
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  // Location search
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);

  // Sync from user context (only when not editing)
  useEffect(() => {
    if (user && !editing) {
      setEmail(user.email || "");
      setBusinessName(user.businessName || "");
      setProfileImage(user.profileImage || null);
      setSelectedLocation(user.location || location);
      setProfileFile(null);
    }
  }, [user, location, editing]);

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

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await completeProfileSetup(
        {
          businessName: businessName.trim(),
          profileImage,
          location: selectedLocation,
        },
        profileFile
      );
      setEditing(false);
      setEditingLocation(false);
      setProfileFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEmail(user.email || "");
      setBusinessName(user.businessName || "");
      setProfileImage(user.profileImage || null);
      setSelectedLocation(user.location || location);
    }
    setProfileFile(null);
    setEditing(false);
    setEditingLocation(false);
    setError("");
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem(LANG_KEY, lang);
  };

  const handleSignOut = () => {
    setSignOutOpen(false);
    logout();
    navigate("/");
  };

  if (!user) {
    navigate("/");
    return null;
  }

  const sidebarItems = [
    { label: AppText.profilePage.title, icon: <PersonOutlineIcon />, active: true, onClick: () => {} },
    { label: AppText.profilePage.manageAddresses, icon: <LocationOnIcon />, active: false, onClick: () => navigate("/manage-addresses") },
    { label: AppText.profilePage.signOut, icon: <LogoutIcon />, active: false, onClick: () => setSignOutOpen(true) },
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, py: 4 }}>
      <Box sx={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
        {/* Left sidebar */}
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            flexShrink: 0,
            width: 240,
          }}
        >
          <List disablePadding>
            {sidebarItems.map((item) => (
              <ListItemButton
                key={item.label}
                onClick={item.onClick}
                sx={{
                  py: 1.25,
                  px: 2,
                  borderRadius: 1.5,
                  mb: 0.5,
                  backgroundColor: item.active ? `${theme.palette.secondary.main}10` : "transparent",
                  "&:hover": {
                    backgroundColor: item.active
                      ? `${theme.palette.secondary.main}15`
                      : theme.palette.grey[50],
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: item.active ? theme.palette.secondary.main : theme.palette.text.secondary,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "0.9rem",
                    fontWeight: item.active ? 600 : 400,
                    color: item.active ? theme.palette.secondary.main : theme.palette.text.primary,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Right content */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {/* Public Profile header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: theme.palette.text.primary }}
            >
              {AppText.profilePage.publicProfile}
            </Typography>
            {!editing ? (
              <Typography
                variant="body2"
                onClick={() => setEditing(true)}
                sx={{
                  color: theme.palette.secondary.main,
                  fontWeight: 600,
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {AppText.profilePage.editDetails}
              </Typography>
            ) : (
              <Typography
                variant="body2"
                onClick={handleCancel}
                sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {AppText.common.cancel}
              </Typography>
            )}
          </Box>

          {/* Avatar + business name + phone */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 4 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={profileImage || undefined}
                sx={{
                  width: 80,
                  height: 80,
                  backgroundColor: theme.palette.secondary.main,
                  fontSize: "2rem",
                  fontWeight: 700,
                }}
              >
                {user.businessName?.charAt(0).toUpperCase()}
              </Avatar>
              {editing && (
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    backgroundColor: theme.palette.common.white,
                    border: `1px solid ${theme.palette.divider}`,
                    width: 28,
                    height: 28,
                    "&:hover": { backgroundColor: theme.palette.grey[100] },
                  }}
                >
                  <CameraAltIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                </IconButton>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageUpload}
              />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.3 }}
              >
                {user.businessName || "User"}
              </Typography>
              {user.phone && (
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.text.secondary, mt: 0.25 }}
                >
                  +91 {user.phone}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Form fields */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 500 }}>
            {/* Email (optional) */}
            <TextField
              label={AppText.profilePage.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              size="small"
              disabled={!editing}
              fullWidth
            />

            {/* Phone (read-only always) */}
            <TextField
              label={AppText.profilePage.phone}
              value={user.phone}
              variant="outlined"
              size="small"
              disabled
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        +91
                      </Typography>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* Business Name */}
            <TextField
              label={AppText.profilePage.businessName}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              variant="outlined"
              size="small"
              disabled={!editing}
              fullWidth
            />

            {/* Location */}
            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 1, fontSize: "0.8rem" }}
              >
                {AppText.profilePage.location}
              </Typography>

              {editing && editingLocation ? (
                <Box>
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
                      placeholder="Search city..."
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
                    py: 1.25,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationOnIcon sx={{ color: theme.palette.secondary.main, fontSize: 20 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
                      {selectedLocation?.displayName || "Not set"}
                    </Typography>
                  </Box>
                  {editing && (
                    <IconButton
                      size="small"
                      onClick={() => setEditingLocation(true)}
                      sx={{ color: theme.palette.secondary.main }}
                    >
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </Box>
              )}
            </Box>

            {/* Error */}
            {error && (
              <Typography variant="body2" sx={{ color: theme.palette.error.main }}>
                {error}
              </Typography>
            )}

            {/* Save button */}
            {editing && (
              <AppButton
                label={saving ? "" : AppText.profilePage.saveChanges}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : undefined}
                disabled={saving || !businessName.trim()}
                onClick={handleSave}
                sx={{
                  backgroundColor: theme.palette.secondary.main,
                  color: theme.palette.common.white,
                  py: 1.25,
                  fontWeight: 700,
                  alignSelf: "flex-start",
                  px: 4,
                  "&:hover": { backgroundColor: theme.palette.secondary.dark },
                  "&.Mui-disabled": {
                    backgroundColor: theme.palette.grey[300],
                    color: theme.palette.text.disabled,
                  },
                }}
              />
            )}
          </Box>

          {/* Language Preferences */}
          <Divider sx={{ my: 4 }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 0.5 }}
          >
            {AppText.profilePage.languagePreferences}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: theme.palette.text.secondary, mb: 2.5 }}
          >
            {AppText.profilePage.languageSubtitle}
          </Typography>
          <RadioGroup
            row
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            sx={{ gap: 2 }}
          >
            {[
              { value: "en", label: AppText.profilePage.english, sub: "Default" },
              { value: "hi", label: AppText.profilePage.hindi, sub: "हिंदी" },
            ].map((opt) => (
              <Box
                key={opt.value}
                onClick={() => handleLanguageChange(opt.value)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  border: `1.5px solid ${language === opt.value ? theme.palette.secondary.main : theme.palette.divider}`,
                  borderRadius: 2,
                  px: 2,
                  py: 1.25,
                  cursor: "pointer",
                  minWidth: 150,
                  backgroundColor: language === opt.value ? `${theme.palette.secondary.main}06` : "transparent",
                  transition: "border-color 0.2s",
                }}
              >
                <Radio
                  checked={language === opt.value}
                  value={opt.value}
                  sx={{
                    p: 0,
                    mr: 1.5,
                    color: theme.palette.grey[400],
                    "&.Mui-checked": { color: theme.palette.secondary.main },
                  }}
                />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary, lineHeight: 1.3 }}>
                    {opt.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                    {opt.sub}
                  </Typography>
                </Box>
              </Box>
            ))}
          </RadioGroup>
        </Box>
      </Box>

      {/* Sign out confirmation dialog */}
      <Dialog
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 340 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Sign Out</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: theme.palette.text.secondary }}>
            Are you sure you want to sign out of your account?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setSignOutOpen(false)}
            sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSignOut}
            variant="contained"
            sx={{
              backgroundColor: theme.palette.error.main,
              fontWeight: 600,
              "&:hover": { backgroundColor: theme.palette.error.dark },
            }}
          >
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
