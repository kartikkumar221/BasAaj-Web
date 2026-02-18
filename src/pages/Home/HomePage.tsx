import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import { useTheme } from "@mui/material/styles";
import { AppText } from "../../constants";
import { useAuth } from "../../context/AuthContext";
import { BusinessSidebar, OfferCard } from "../../components/home";

const HomePage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const offers = AppText.home.offers;
  const locationName = user?.location?.city || user?.location?.displayName || "Your Area";
  const regionName = user?.location?.region || "";

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
      <Box sx={{ display: "flex", gap: 3 }}>
        {/* Left sidebar */}
        <Box
          sx={{
            width: 240,
            flexShrink: 0,
            display: { xs: "none", md: "block" },
          }}
        >
          <BusinessSidebar />
        </Box>

        {/* Main content */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {/* Breadcrumb + results count */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Breadcrumbs
              sx={{ fontSize: "0.8rem" }}
              separator="/"
            >
              <Link
                underline="hover"
                color="text.secondary"
                href="#"
                sx={{ fontSize: "0.8rem" }}
              >
                {AppText.home.breadcrumbHome}
              </Link>
              {regionName && (
                <Link
                  underline="hover"
                  color="text.secondary"
                  href="#"
                  sx={{ fontSize: "0.8rem" }}
                >
                  {regionName}
                </Link>
              )}
              <Typography
                color="text.primary"
                sx={{ fontSize: "0.8rem", fontWeight: 500 }}
              >
                {locationName}
              </Typography>
            </Breadcrumbs>
            <Typography
              variant="body2"
              sx={{ color: theme.palette.text.secondary, fontSize: "0.8rem", flexShrink: 0 }}
            >
              {AppText.home.showingResults.replace("{count}", String(offers.length * 35))}
            </Typography>
          </Box>

          {/* Page title */}
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 3 }}
          >
            {AppText.home.offersIn} {locationName}
          </Typography>

          {/* Offers grid - 2 columns like the screenshot */}
          <Grid container spacing={2.5}>
            {offers.map((offer) => (
              <Grid key={offer.title} size={{ xs: 12, sm: 6 }}>
                <OfferCard
                  title={offer.title}
                  location={offer.location}
                  discount={offer.discount}
                  image={offer.image}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
