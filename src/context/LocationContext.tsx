import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { loadGoogleMaps } from "../utils/googleMaps";

export interface LocationData {
  city: string;
  region: string;
  country: string;
  displayName: string;
  lat: number;
  lng: number;
  placeId?: string;
}

interface LocationContextType {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  detectCurrentLocation: () => void;
  setLocationManually: (location: LocationData) => void;
  searchLocations: (query: string) => Promise<LocationData[]>;
}

const LocationContext = createContext<LocationContextType | null>(null);

const extractAddressComponent = (
  components: google.maps.GeocoderAddressComponent[],
  type: string
): string => {
  const comp = components.find((c) => c.types.includes(type));
  return comp?.long_name || "";
};

const geocoderResultToLocation = (result: google.maps.GeocoderResult): LocationData => {
  const components = result.address_components;
  const city =
    extractAddressComponent(components, "locality") ||
    extractAddressComponent(components, "administrative_area_level_2");
  const region = extractAddressComponent(components, "administrative_area_level_1");
  const country = extractAddressComponent(components, "country");
  return {
    city,
    region,
    country,
    displayName: city && country ? `${city}, ${country}` : result.formatted_address,
    lat: result.geometry.location.lat(),
    lng: result.geometry.location.lng(),
    placeId: result.place_id,
  };
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<LocationData> => {
    await loadGoogleMaps();
    const geocoder = new google.maps.Geocoder();
    const response = await geocoder.geocode({ location: { lat, lng } });
    if (response.results.length === 0) {
      throw new Error("No results found");
    }
    return geocoderResultToLocation(response.results[0]);
  }, []);

  const detectCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const loc = await reverseGeocode(position.coords.latitude, position.coords.longitude);
          setLocation(loc);
        } catch {
          setError("Could not detect location. Please search manually.");
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setIsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied. Please search manually.");
        } else {
          setError("Could not detect location. Please search manually.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [reverseGeocode]);

  const setLocationManually = useCallback((loc: LocationData) => {
    setLocation(loc);
    setError(null);
  }, []);

  const searchLocations = useCallback(async (query: string): Promise<LocationData[]> => {
    if (!query.trim()) return [];
    await loadGoogleMaps();

    return new Promise((resolve) => {
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        { input: query, types: ["(cities)"] },
        (predictions, status) => {
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !predictions
          ) {
            resolve([]);
            return;
          }

          const geocoder = new google.maps.Geocoder();
          const promises = predictions.slice(0, 5).map(
            (prediction) =>
              new Promise<LocationData | null>((res) => {
                geocoder.geocode({ placeId: prediction.place_id }, (results, geoStatus) => {
                  if (geoStatus === google.maps.GeocoderStatus.OK && results && results[0]) {
                    res(geocoderResultToLocation(results[0]));
                  } else {
                    res(null);
                  }
                });
              })
          );

          Promise.all(promises).then((results) => {
            resolve(results.filter((r): r is LocationData => r !== null));
          });
        }
      );
    });
  }, []);

  useEffect(() => {
    detectCurrentLocation();
  }, [detectCurrentLocation]);

  return (
    <LocationContext.Provider
      value={{ location, isLoading, error, detectCurrentLocation, setLocationManually, searchLocations }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
};
