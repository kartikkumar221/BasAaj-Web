import { useState, useRef, useEffect, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import InputBase from "@mui/material/InputBase";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HomeIcon from "@mui/icons-material/Home";
import WorkIcon from "@mui/icons-material/Work";
import PlaceIcon from "@mui/icons-material/Place";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LogoutIcon from "@mui/icons-material/Logout";
import SearchIcon from "@mui/icons-material/Search";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { AppText } from "../../constants";
import { useAuth } from "../../context/AuthContext";
import { loadGoogleMaps } from "../../utils/googleMaps";
import {
  getRecentActivity,
  addSavedAddress,
  deleteSavedAddress,
  type SavedAddressDto,
} from "../../services/userService";

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

const getAddressIcon = (label: string) => {
  if (label === "Home") return <HomeIcon />;
  if (label === "Work") return <WorkIcon />;
  return <PlaceIcon />;
};

const ManageAddresses = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [addresses, setAddresses] = useState<SavedAddressDto[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Dialog state
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddressDto | null>(null);
  const [addrLabel, setAddrLabel] = useState("Home");
  const [addrLine, setAddrLine] = useState("");
  const [addrLat, setAddrLat] = useState<number | undefined>(undefined);
  const [addrLng, setAddrLng] = useState<number | undefined>(undefined);
  const [_addrPlaceId, setAddrPlaceId] = useState<string | undefined>(undefined);

  const [deleteAddrTarget, setDeleteAddrTarget] = useState<SavedAddressDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addrMenuAnchor, setAddrMenuAnchor] = useState<null | HTMLElement>(null);
  const [addrMenuId, setAddrMenuId] = useState<string | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);

  // Google Places search
  const [locationQuery, setLocationQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);

  const getAutocompleteService = useCallback(async () => {
    if (autocompleteRef.current) return autocompleteRef.current;
    await loadGoogleMaps();
    autocompleteRef.current = new google.maps.places.AutocompleteService();
    return autocompleteRef.current;
  }, []);

  // Fetch addresses from backend on mount
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoadingAddresses(true);
      try {
        const activity = await getRecentActivity();
        if (!cancelled) setAddresses(activity.savedAddresses ?? []);
      } catch {
        // silently fail – show empty state
      } finally {
        if (!cancelled) setLoadingAddresses(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, []);

  // Debounced Google Places search
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
          { input: locationQuery },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              setPredictions(
                results.slice(0, 5).map((r) => ({
                  placeId: r.place_id,
                  mainText: r.structured_formatting.main_text,
                  secondaryText: r.structured_formatting.secondary_text,
                  fullText: r.description,
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [locationQuery, getAutocompleteService]);

  const handleSelectPrediction = async (prediction: Prediction) => {
    setAddrLine(prediction.fullText);
    setLocationQuery("");
    setPredictions([]);
    try {
      await loadGoogleMaps();
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ placeId: prediction.placeId }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
          const r = results[0];
          setAddrLat(r.geometry.location.lat());
          setAddrLng(r.geometry.location.lng());
          setAddrPlaceId(prediction.placeId);
        }
      });
    } catch {
      // coordinates unavailable
    }
  };

  // Dialog open helpers
  const openAddAddress = () => {
    setEditingAddress(null);
    setAddrLabel("Home");
    setAddrLine("");
    setAddrLat(undefined);
    setAddrLng(undefined);
    setAddrPlaceId(undefined);
    setLocationQuery("");
    setPredictions([]);
    setSaveError("");
    setAddressDialogOpen(true);
  };

  const openEditAddress = (addr: SavedAddressDto) => {
    setEditingAddress(addr);
    setAddrLabel(addr.label);
    setAddrLine(addr.address);
    setAddrLat(addr.latitude);
    setAddrLng(addr.longitude);
    setAddrPlaceId(undefined);
    setLocationQuery("");
    setPredictions([]);
    setSaveError("");
    setAddressDialogOpen(true);
    setAddrMenuAnchor(null);
    setAddrMenuId(null);
  };

  const handleSaveAddress = async () => {
    if (!addrLine.trim() || addrLat == null || addrLng == null) return;
    setSaving(true);
    setSaveError("");
    try {
      // For edit: delete old then add new (backend has no PUT endpoint)
      if (editingAddress) {
        await deleteSavedAddress(editingAddress.id);
      }
      await addSavedAddress(addrLabel, addrLine.trim(), addrLat, addrLng);

      // Refresh list
      const activity = await getRecentActivity();
      setAddresses(activity.savedAddresses ?? []);
      setAddressDialogOpen(false);
    } catch {
      setSaveError("Failed to save address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (!deleteAddrTarget) return;
    setDeleting(true);
    try {
      await deleteSavedAddress(deleteAddrTarget.id);
      setAddresses((prev) => prev.filter((a) => a.id !== deleteAddrTarget.id));
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
      setDeleteAddrTarget(null);
    }
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

  const canSave = addrLine.trim().length > 0 && addrLat != null && addrLng != null;

  const sidebarItems = [
    { label: AppText.profilePage.title, icon: <PersonOutlineIcon />, active: false, onClick: () => navigate("/profile") },
    { label: AppText.profilePage.manageAddresses, icon: <LocationOnIcon />, active: true, onClick: () => {} },
    { label: AppText.profilePage.signOut, icon: <LogoutIcon />, active: false, onClick: () => setSignOutOpen(true) },
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 2, md: 4 } }}>
      {/* Mobile nav tabs */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          gap: 1,
          mb: 2,
          overflowX: "auto",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {sidebarItems.map((item) => (
          <Box
            key={item.label}
            onClick={item.onClick}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.5,
              py: 0.75,
              borderRadius: 5,
              cursor: "pointer",
              flexShrink: 0,
              border: `1.5px solid ${item.active ? theme.palette.secondary.main : theme.palette.divider}`,
              backgroundColor: item.active ? `${theme.palette.secondary.main}10` : "transparent",
            }}
          >
            <Box sx={{ color: item.active ? theme.palette.secondary.main : theme.palette.text.secondary, display: "flex", "& svg": { fontSize: 18 } }}>
              {item.icon}
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: item.active ? 600 : 400,
                color: item.active ? theme.palette.secondary.main : theme.palette.text.primary,
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "flex", gap: { xs: 0, md: 4 }, alignItems: "flex-start" }}>
        {/* Left sidebar */}
        <Box sx={{ display: { xs: "none", md: "block" }, flexShrink: 0, width: 240 }}>
          <List disablePadding>
            {sidebarItems.map((item) => (
              <ListItemButton
                key={item.label}
                onClick={item.onClick}
                sx={{
                  py: 1.25, px: 2, borderRadius: 1.5, mb: 0.5,
                  backgroundColor: item.active ? `${theme.palette.secondary.main}10` : "transparent",
                  "&:hover": { backgroundColor: item.active ? `${theme.palette.secondary.main}15` : theme.palette.grey[50] },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: item.active ? theme.palette.secondary.main : theme.palette.text.secondary }}>
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
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {AppText.profilePage.manageAddresses}
            </Typography>
            <Typography
              variant="body2"
              onClick={openAddAddress}
              sx={{ color: theme.palette.secondary.main, fontWeight: 600, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
            >
              {AppText.profilePage.addNewAddress}
            </Typography>
          </Box>

          {/* Address list */}
          {loadingAddresses ? (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              {[0, 1].map((i) => (
                <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
              ))}
            </Box>
          ) : addresses.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, border: `1px dashed ${theme.palette.divider}`, borderRadius: 2 }}>
              <LocationOnIcon sx={{ fontSize: 48, color: theme.palette.grey[300], mb: 1 }} />
              <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 1, fontWeight: 600 }}>
                No addresses saved yet
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                Add your first address to get started.
              </Typography>
              <Typography
                variant="body2"
                onClick={openAddAddress}
                sx={{ color: theme.palette.secondary.main, fontWeight: 600, cursor: "pointer" }}
              >
                {AppText.profilePage.addNewAddress}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              {addresses.map((addr) => (
                <Box
                  key={addr.id}
                  sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, p: 2 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ color: theme.palette.secondary.main, display: "flex" }}>
                        {getAddressIcon(addr.label)}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                        {addr.label}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => { setAddrMenuAnchor(e.currentTarget); setAddrMenuId(addr.id); }}
                    >
                      <MoreVertIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.8rem", lineHeight: 1.5 }}>
                    {addr.address}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, mt: 1.5, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Typography
                      variant="caption"
                      onClick={() => openEditAddress(addr)}
                      sx={{ color: theme.palette.secondary.main, fontWeight: 600, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                    >
                      {AppText.common.edit}
                    </Typography>
                    <Typography
                      variant="caption"
                      onClick={() => setDeleteAddrTarget(addr)}
                      sx={{ color: theme.palette.error.main, fontWeight: 600, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                    >
                      {AppText.common.delete}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Address card context menu */}
      <Menu
        anchorEl={addrMenuAnchor}
        open={Boolean(addrMenuAnchor)}
        onClose={() => { setAddrMenuAnchor(null); setAddrMenuId(null); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 120, borderRadius: 1.5 } } }}
      >
        <MenuItem
          onClick={() => {
            const addr = addresses.find((a) => a.id === addrMenuId);
            if (addr) openEditAddress(addr);
          }}
          sx={{ fontSize: "0.85rem" }}
        >
          {AppText.common.edit}
        </MenuItem>
        <MenuItem
          onClick={() => {
            const addr = addresses.find((a) => a.id === addrMenuId);
            if (addr) setDeleteAddrTarget(addr);
            setAddrMenuAnchor(null);
            setAddrMenuId(null);
          }}
          sx={{ fontSize: "0.85rem", color: theme.palette.error.main }}
        >
          {AppText.common.delete}
        </MenuItem>
      </Menu>

      {/* Add/Edit Address dialog */}
      <Dialog
        open={addressDialogOpen}
        onClose={() => !saving && setAddressDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: { xs: 320, sm: 480 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {editingAddress ? "Edit Address" : "Add New Address"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "16px !important" }}>
          {/* Label selector */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 1, fontSize: "0.8rem" }}>
              {AppText.profilePage.addressLabel}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {(["Home", "Work", "Other"] as const).map((lbl) => (
                <Box
                  key={lbl}
                  onClick={() => setAddrLabel(lbl)}
                  sx={{
                    display: "flex", alignItems: "center", gap: 0.5,
                    px: 2, py: 0.75, borderRadius: 5, cursor: "pointer",
                    border: `1.5px solid ${addrLabel === lbl ? theme.palette.secondary.main : theme.palette.divider}`,
                    backgroundColor: addrLabel === lbl ? `${theme.palette.secondary.main}10` : "transparent",
                    transition: "all 0.2s",
                  }}
                >
                  <Box sx={{ color: addrLabel === lbl ? theme.palette.secondary.main : theme.palette.text.secondary, display: "flex", "& svg": { fontSize: 18 } }}>
                    {getAddressIcon(lbl)}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: addrLabel === lbl ? 600 : 400,
                      color: addrLabel === lbl ? theme.palette.secondary.main : theme.palette.text.primary,
                      fontSize: "0.85rem",
                    }}
                  >
                    {lbl}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Google Places search */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 1, fontSize: "0.8rem" }}>
              Search Address
            </Typography>
            <Box
              sx={{
                display: "flex", alignItems: "center",
                border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, px: 1.5, py: 0.5,
                "&:focus-within": { borderColor: theme.palette.secondary.main },
              }}
            >
              <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 1, fontSize: 20 }} />
              <InputBase
                placeholder="Search for address, area, landmark..."
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                sx={{ width: "100%", fontSize: "0.85rem" }}
              />
              {searching && <CircularProgress size={16} />}
            </Box>
            {predictions.length > 0 && (
              <List
                disablePadding
                sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, overflow: "hidden", mt: 0.5, maxHeight: 200, overflowY: "auto" }}
              >
                {predictions.map((p) => (
                  <ListItemButton key={p.placeId} onClick={() => handleSelectPrediction(p)} sx={{ px: 2, py: 0.75 }}>
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

          {/* Selected address display */}
          {addrLine ? (
            <Box
              sx={{
                display: "flex", alignItems: "flex-start", gap: 1,
                p: 1.5, borderRadius: 1.5,
                backgroundColor: theme.palette.grey[50],
                border: `1px solid ${addrLat != null ? theme.palette.success.light : theme.palette.divider}`,
              }}
            >
              <LocationOnIcon sx={{ fontSize: 18, color: theme.palette.secondary.main, mt: 0.1, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontSize: "0.85rem", lineHeight: 1.5 }}>
                  {addrLine}
                </Typography>
                {addrLat == null && (
                  <Typography variant="caption" sx={{ color: theme.palette.warning.main }}>
                    Search and select a place above to confirm location
                  </Typography>
                )}
              </Box>
            </Box>
          ) : (
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Search and select an address above to save it.
            </Typography>
          )}

          {saveError && (
            <Typography variant="caption" sx={{ color: theme.palette.error.main }}>
              {saveError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setAddressDialogOpen(false)}
            disabled={saving}
            sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveAddress}
            variant="contained"
            disabled={!canSave || saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              backgroundColor: theme.palette.secondary.main,
              fontWeight: 600,
              "&:hover": { backgroundColor: theme.palette.secondary.dark },
            }}
          >
            {saving ? "Saving..." : AppText.common.save}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteAddrTarget !== null}
        onClose={() => !deleting && setDeleteAddrTarget(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 340 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{AppText.profilePage.deleteAddress}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: theme.palette.text.secondary }}>
            {AppText.profilePage.deleteAddressConfirm}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteAddrTarget(null)} disabled={deleting} sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAddress}
            disabled={deleting}
            variant="contained"
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ backgroundColor: theme.palette.error.main, fontWeight: 600, "&:hover": { backgroundColor: theme.palette.error.dark } }}
          >
            {deleting ? "Deleting..." : AppText.common.delete}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sign out confirmation */}
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
          <Button onClick={() => setSignOutOpen(false)} sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSignOut}
            variant="contained"
            sx={{ backgroundColor: theme.palette.error.main, fontWeight: 600, "&:hover": { backgroundColor: theme.palette.error.dark } }}
          >
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageAddresses;
