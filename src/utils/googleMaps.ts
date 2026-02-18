const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string;

let loadPromise: Promise<void> | null = null;

export const loadGoogleMaps = (): Promise<void> => {
  if (window.google?.maps?.places) return Promise.resolve();

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return loadPromise;
};
