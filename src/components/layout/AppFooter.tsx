import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Button from "@mui/material/Button";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTheme } from "@mui/material/styles";
import { AppText } from "../../constants";

const footerLinks = [
  AppText.footer.privacy,
  AppText.footer.terms,
  AppText.footer.aboutUs,
  AppText.footer.contactUs,
];

const AppFooter = () => {
  const theme = useTheme();

  return (
    <Box component="footer">
      {/* CTA Banner */}
      <Box
        sx={{
          backgroundColor: theme.palette.grey[900],
          py: { xs: 4, md: 5 },
          px: { xs: 2, md: 3 },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto" }}>
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.common.white,
              fontWeight: 700,
              mb: 1.5,
              fontSize: { xs: "1.3rem", md: "1.5rem" },
            }}
          >
            Start Saving with{" "}
            <Box
              component="span"
              sx={{ color: theme.palette.secondary.main }}
            >
              {AppText.app.name}
            </Box>{" "}
            Today
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: theme.palette.grey[400],
              mb: 3,
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            Join thousands of users discovering amazing local deals. No sign-up fee.
            {"\n"}Start exploring now.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{
                backgroundColor: theme.palette.secondary.main,
                color: theme.palette.common.white,
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 1,
                "&:hover": { backgroundColor: theme.palette.secondary.dark },
              }}
            >
              Download App
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderColor: theme.palette.grey[600],
                color: theme.palette.common.white,
                textTransform: "none",
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 1,
                "&:hover": {
                  borderColor: theme.palette.common.white,
                  backgroundColor: "rgba(255,255,255,0.05)",
                },
              }}
            >
              Learn More
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={{ color: theme.palette.grey[500], fontSize: "0.75rem" }}
          >
            Free to use · No hidden charges · Available on iOS & Android
          </Typography>
        </Box>
      </Box>

      {/* Bottom bar */}
      <Box
        sx={{
          backgroundColor: theme.palette.grey[900],
          borderTop: `1px solid ${theme.palette.grey[800]}`,
          py: 2,
          px: { xs: 2, md: 3 },
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 0.5,
                backgroundColor: theme.palette.secondary.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{ color: theme.palette.common.white, fontWeight: 700, fontSize: "0.85rem" }}
              >
                B
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ color: theme.palette.common.white, fontWeight: 700, mr: 1 }}
            >
              {AppText.app.name}
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.grey[500] }}>
              {AppText.footer.copyright}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 3 }}>
            {footerLinks.map((link) => (
              <Link
                key={link}
                href="#"
                underline="hover"
                sx={{
                  color: theme.palette.grey[400],
                  fontSize: "0.8rem",
                  "&:hover": { color: theme.palette.common.white },
                }}
              >
                {link}
              </Link>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppFooter;
