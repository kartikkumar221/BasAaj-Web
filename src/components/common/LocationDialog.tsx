import { useState, useEffect, useRef, useCallback } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import SearchIcon from "@mui/icons-material/Search";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import { AppText } from "../../constants";
import { useLocation, type LocationData } from "../../context/LocationContext";
import { loadGoogleMaps } from "../../utils/googleMaps";

const POPULAR_CITIES: LocationData[] = [
  { city: "Mumbai", region: "Maharashtra", country: "India", displayName: "Mumbai, India", lat: 19.076, lng: 72.8777 },
  { city: "Delhi", region: "Delhi", country: "India", displayName: "Delhi, India", lat: 28.6139, lng: 77.209 },
  { city: "Bangalore", region: "Karnataka", country: "India", displayName: "Bangalore, India", lat: 12.9716, lng: 77.5946 },
  { city: "Hyderabad", region: "Telangana", country: "India", displayName: "Hyderabad, India", lat: 17.385, lng: 78.4867 },
  { city: "Chennai", region: "Tamil Nadu", country: "India", displayName: "Chennai, India", lat: 13.0827, lng: 80.2707 },
  { city: "Pune", region: "Maharashtra", country: "India", displayName: "Pune, India", lat: 18.5204, lng: 73.8567 },
];

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface LocationDialogProps {
  open: boolean;
  onClose: () => void;
}

const LocationDialog = ({ open, onClose }: LocationDialogProps) => {
  const theme = useTheme();
  const { isLoading, error, detectCurrentLocation, setLocationManually } = useLocation();
  const [query, setQuery] = useState("");
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

  useEffect(() => {
    if (!query.trim()) {
      setPredictions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const service = await getAutocompleteService();
        service.getPlacePredictions(
          { input: query, types: ["(cities)"] },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              setPredictions(
                results.slice(0, 5).map((r) => ({
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
  }, [query, getAutocompleteService]);

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

        setLocationManually({
          city,
          region,
          country,
          displayName: `${city}, ${country}`,
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          placeId: prediction.placeId,
        });
      }
      setQuery("");
      onClose();
    });
  };

  const handleSelectCity = (loc: LocationData) => {
    setLocationManually(loc);
    setQuery("");
    onClose();
  };

  const handleDetect = () => {
    detectCurrentLocation();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 0,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {AppText.location.dialogTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {AppText.location.dialogSubtitle}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Search input */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            px: 2,
            py: 0.75,
            mb: 2,
            "&:focus-within": { borderColor: theme.palette.primary.main },
          }}
        >
          <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 1 }} />
          <InputBase
            placeholder={AppText.location.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ width: "100%", fontSize: "0.9rem" }}
            autoFocus
          />
          {searching && <CircularProgress size={18} />}
        </Box>

        {/* Use current location */}
        <ListItemButton
          onClick={handleDetect}
          sx={{ borderRadius: 2, mb: 1, px: 2 }}
          disabled={isLoading}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {isLoading ? (
              <CircularProgress size={20} />
            ) : (
              <MyLocationIcon sx={{ color: theme.palette.secondary.main }} />
            )}
          </ListItemIcon>
          <ListItemText
            primary={
              isLoading
                ? AppText.location.detecting
                : AppText.location.useCurrentLocation
            }
            primaryTypographyProps={{
              fontWeight: 600,
              color: theme.palette.secondary.main,
              fontSize: "0.9rem",
            }}
          />
        </ListItemButton>

        {error && (
          <Typography variant="body2" sx={{ color: theme.palette.error.main, px: 2, mb: 1 }}>
            {error}
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Google Places search results or popular cities */}
        {query.trim() && predictions.length > 0 ? (
          <List disablePadding>
            {predictions.map((prediction) => (
              <ListItemButton
                key={prediction.placeId}
                onClick={() => handleSelectPrediction(prediction)}
                sx={{ borderRadius: 2, px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <LocationOnIcon sx={{ color: theme.palette.text.secondary }} />
                </ListItemIcon>
                <ListItemText
                  primary={prediction.mainText}
                  secondary={prediction.secondaryText}
                  primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: 500 }}
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: theme.palette.text.secondary, px: 2, py: 1 }}
            >
              {AppText.location.popularCities}
            </Typography>
            <List disablePadding>
              {POPULAR_CITIES.map((loc) => (
                <ListItemButton
                  key={loc.city}
                  onClick={() => handleSelectCity(loc)}
                  sx={{ borderRadius: 2, px: 2 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <LocationOnIcon sx={{ color: theme.palette.text.secondary }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={loc.city}
                    secondary={`${loc.region}, ${loc.country}`}
                    primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: 500 }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LocationDialog;
