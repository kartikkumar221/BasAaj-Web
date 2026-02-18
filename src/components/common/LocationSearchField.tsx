import { useState, useEffect, useRef, useCallback } from "react";
import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SearchIcon from "@mui/icons-material/Search";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { useTheme } from "@mui/material/styles";
import { loadGoogleMaps } from "../../utils/googleMaps";

export interface PlaceResult {
  displayName: string;
  lat: number;
  lng: number;
  placeId: string;
  city: string;
  region: string;
  country: string;
}

interface Prediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface LocationSearchFieldProps {
  value: string;
  onChange: (place: PlaceResult) => void;
  placeholder?: string;
}

const LocationSearchField = ({ value, onChange, placeholder }: LocationSearchFieldProps) => {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getAutocompleteService = useCallback(async () => {
    if (autocompleteRef.current) return autocompleteRef.current;
    await loadGoogleMaps();
    autocompleteRef.current = new google.maps.places.AutocompleteService();
    return autocompleteRef.current;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
        setPredictions([]);
        setQuery("");
      }
    };
    if (editing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editing]);

  // Debounced autocomplete search
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
          { input: query, types: ["establishment", "geocode"] },
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

  const extractComponent = (
    components: google.maps.GeocoderAddressComponent[],
    type: string
  ): string =>
    components.find((c) => c.types.includes(type))?.long_name || "";

  const handleSelectPrediction = async (prediction: Prediction) => {
    await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.placeId }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
        const result = results[0];
        const components = result.address_components;
        onChange({
          displayName: result.formatted_address,
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          placeId: prediction.placeId,
          city:
            extractComponent(components, "locality") ||
            extractComponent(components, "administrative_area_level_2") ||
            prediction.mainText,
          region: extractComponent(components, "administrative_area_level_1"),
          country: extractComponent(components, "country"),
        });
      }
      setEditing(false);
      setPredictions([]);
      setQuery("");
    });
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await loadGoogleMaps();
          const geocoder = new google.maps.Geocoder();
          const response = await geocoder.geocode({
            location: { lat: position.coords.latitude, lng: position.coords.longitude },
          });
          if (response.results?.[0]) {
            const result = response.results[0];
            const components = result.address_components;
            onChange({
              displayName: result.formatted_address,
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
              placeId: result.place_id,
              city:
                extractComponent(components, "locality") ||
                extractComponent(components, "administrative_area_level_2"),
              region: extractComponent(components, "administrative_area_level_1"),
              country: extractComponent(components, "country"),
            });
          }
        } catch {
          // silently fail
        } finally {
          setDetecting(false);
          setEditing(false);
        }
      },
      () => setDetecting(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startEditing = () => {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Display mode ──
  if (!editing) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          px: 1.5,
          py: 1.2,
        }}
      >
        <LocationOnIcon
          sx={{ fontSize: 18, color: theme.palette.secondary.main, mr: 1 }}
        />
        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.primary, flexGrow: 1 }}
          noWrap
        >
          {value || placeholder || "Select location"}
        </Typography>
        <Typography
          variant="body2"
          onClick={startEditing}
          sx={{
            color: theme.palette.secondary.main,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Change
        </Typography>
      </Box>
    );
  }

  // ── Edit mode with search ──
  return (
    <Box ref={containerRef} sx={{ position: "relative" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          border: `1px solid ${theme.palette.secondary.main}`,
          borderRadius: 1,
          px: 1.5,
          py: 0.75,
        }}
      >
        <SearchIcon sx={{ fontSize: 18, color: theme.palette.text.secondary, mr: 1 }} />
        <InputBase
          inputRef={inputRef}
          placeholder="Search for a place or address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flexGrow: 1, fontSize: "0.875rem" }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditing(false);
              setPredictions([]);
              setQuery("");
            }
          }}
        />
        {searching && <CircularProgress size={16} />}
      </Box>

      {/* Dropdown */}
      {editing && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1300,
            mt: 0.5,
            borderRadius: 1.5,
            maxHeight: 280,
            overflow: "auto",
          }}
        >
          <List disablePadding>
            {/* Use current location */}
            <ListItemButton
              onClick={handleDetectLocation}
              disabled={detecting}
              sx={{ py: 1, px: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {detecting ? (
                  <CircularProgress size={18} />
                ) : (
                  <MyLocationIcon sx={{ fontSize: 18, color: theme.palette.secondary.main }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={detecting ? "Detecting..." : "Use my current location"}
                primaryTypographyProps={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: theme.palette.secondary.main,
                }}
              />
            </ListItemButton>

            {/* Search results */}
            {predictions.map((p) => (
              <ListItemButton
                key={p.placeId}
                onClick={() => handleSelectPrediction(p)}
                sx={{ py: 1, px: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <LocationOnIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                </ListItemIcon>
                <ListItemText
                  primary={p.mainText}
                  secondary={p.secondaryText}
                  primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
              </ListItemButton>
            ))}

            {query.trim() && predictions.length === 0 && !searching && (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                  No results found. Try a different search.
                </Typography>
              </Box>
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default LocationSearchField;
