import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";
import { useSearchParams } from "react-router-dom";
import { BannerCarousel, OfferCard, SearchSidebar } from "../../components/dashboard";
import type { OfferCardData } from "../../components/dashboard/OfferCard";
import { discoverDeals, type DiscoveryDealResponse } from "../../services/dealService";
import { useLocation } from "../../context/LocationContext";
import { AppText } from "../../constants";

const mapDealToCard = (deal: DiscoveryDealResponse): OfferCardData => {
  const discount = deal.discountPercent ?? (
    deal.originalPrice && deal.originalPrice > 0 && deal.dealPrice != null
      ? Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100)
      : 0
  );

  const startDate = new Date(deal.startTime);
  const endDate = new Date(deal.expiryTime);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const validity = `${fmt(startDate)} - ${fmt(endDate)}, ${endDate.getFullYear()}`;

  const distanceStr = deal.distanceKm != null
    ? deal.distanceKm < 1
      ? `${Math.round(deal.distanceKm * 1000)}m`
      : `${deal.distanceKm.toFixed(1)} km`
    : "";

  const images = deal.mediaItems && deal.mediaItems.length > 0
    ? deal.mediaItems
        .filter((m) => !m.type?.toUpperCase().startsWith("VIDEO"))
        .sort((a, b) => a.position - b.position)
        .map((m) => m.url)
    : deal.mediaUrl
    ? [deal.mediaUrl]
    : [];

  return {
    id: deal.id,
    businessName: deal.seller?.name || "",
    title: deal.title,
    description: deal.description || "",
    originalPrice: deal.originalPrice ?? 0,
    discountedPrice: deal.dealPrice ?? 0,
    discount: discount > 0 ? `Flat ${discount}% OFF` : "",
    validity,
    location: deal.location?.address || "",
    distance: distanceStr,
    phone: deal.contactPhone || deal.seller?.phone || "",
    views: deal.viewCount ?? 0,
    image: images[0] || deal.mediaUrl || "",
    images,
    likeCount: deal.likeCount ?? 0,
    dislikeCount: deal.dislikeCount ?? 0,
    userReaction: deal.userReaction,
  };
};

const Dashboard = () => {
  const theme = useTheme();
  const { location } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read all filter params from URL
  const searchQuery = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "";
  const subParam = searchParams.get("subcategory") || "";
  const sortParam = searchParams.get("sort") || "distance";
  const minParam = searchParams.get("minPrice") || "";
  const maxParam = searchParams.get("maxPrice") || "";

  const isSearchMode = Boolean(searchQuery || categoryParam);

  const [offers, setOffers] = useState<OfferCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchDeals = async () => {
      setLoading(true);
      try {
        const lat = location?.lat ?? 19.076;
        const lng = location?.lng ?? 72.8777;

        const page = await discoverDeals({
          latitude: lat,
          longitude: lng,
          q: searchQuery || undefined,
          category: categoryParam || undefined,
          sort: sortParam,
          size: 12,
        });

        if (!cancelled) {
          setOffers(page.content.map(mapDealToCard));
        }
      } catch {
        if (!cancelled) {
          setOffers(
            AppText.dashboardOffers.offers.map((o) => ({
              ...o,
              id: undefined,
              userReaction: null,
            }))
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDeals();
    return () => { cancelled = true; };
  }, [location, searchQuery, categoryParam, sortParam, minParam, maxParam]);

  // Sidebar callbacks — update URL params
  const handleCategoryChange = (category: string, subcategory?: string) => {
    const next = new URLSearchParams();
    next.set("category", category);
    if (subcategory) {
      // Use subcategory name as free-text q so backend search works,
      // and keep subcategory param only for sidebar active-state highlighting.
      next.set("q", subcategory);
      next.set("subcategory", subcategory);
    } else if (searchQuery) {
      next.set("q", searchQuery);
    }
    if (sortParam !== "distance") next.set("sort", sortParam);
    if (minParam) next.set("minPrice", minParam);
    if (maxParam) next.set("maxPrice", maxParam);
    setSearchParams(next);
  };

  const handlePriceGo = (min: string, max: string) => {
    const next = new URLSearchParams(searchParams);
    if (min) next.set("minPrice", min); else next.delete("minPrice");
    if (max) next.set("maxPrice", max); else next.delete("maxPrice");
    setSearchParams(next);
  };

  const handleSortChange = (sort: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", sort);
    setSearchParams(next);
  };

  // Build heading
  const resultsHeading = (() => {
    if (searchQuery && categoryParam) return `Results for "${searchQuery}" in ${categoryParam}`;
    if (searchQuery) return `Results for "${searchQuery}"`;
    if (subParam) return subParam;
    if (categoryParam) return categoryParam;
    return AppText.dashboardOffers.title;
  })();

  // Shared offer grid
  const renderOffers = (gridMd: number) => (
    loading ? (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: theme.palette.secondary.main }} />
      </Box>
    ) : offers.length === 0 ? (
      <Typography
        variant="body1"
        sx={{ color: theme.palette.text.secondary, textAlign: "center", py: 8 }}
      >
        {AppText.home.noOffers}
      </Typography>
    ) : (
      <Grid container spacing={3}>
        {offers.map((offer, index) => (
          <Grid key={offer.id || index} size={{ xs: 12, sm: 6, md: gridMd }}>
            <OfferCard offer={offer} />
          </Grid>
        ))}
      </Grid>
    )
  );

  return (
    <Box>
      {/* Banner — only in browse mode */}
      {!isSearchMode && <BannerCarousel />}

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, pb: 4 }}>
        {isSearchMode ? (
          /* Search mode: sidebar + results */
          <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", mt: 3 }}>
            {/* Left sidebar — desktop only */}
            <Box
              sx={{
                display: { xs: "none", md: "block" },
                flexShrink: 0,
                width: 240,
                position: "sticky",
                top: 80,
              }}
            >
              <SearchSidebar
                selectedCategory={categoryParam}
                selectedSubcategory={subParam}
                minPrice={minParam}
                maxPrice={maxParam}
                onCategoryChange={handleCategoryChange}
                onPriceGo={handlePriceGo}
              />
            </Box>

            {/* Right: heading row + 2-col grid */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              {/* Results heading + Sort By */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: theme.palette.text.primary }}
                >
                  {resultsHeading}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary, whiteSpace: "nowrap" }}
                  >
                    Sort by:
                  </Typography>
                  <Select
                    size="small"
                    value={sortParam}
                    onChange={(e) => handleSortChange(e.target.value)}
                    sx={{ fontSize: "0.85rem", minWidth: 140 }}
                  >
                    <MenuItem value="distance">Distance</MenuItem>
                    <MenuItem value="newest">Newest</MenuItem>
                  </Select>
                </Box>
              </Box>
              {renderOffers(6)}
            </Box>
          </Box>
        ) : (
          /* Browse mode: full-width grid */
          <>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 3 }}
            >
              {AppText.dashboardOffers.title}
            </Typography>
            {renderOffers(4)}
          </>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;
