import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import { AppText } from "../../constants";
import { useAuth } from "../../context/AuthContext";

const BusinessSidebar = () => {
  const theme = useTheme();
  const { user } = useAuth();

  if (!user) return null;

  const stats = [
    { value: 2, label: AppText.home.active },
    { value: 48, label: AppText.home.views },
    { value: 12, label: AppText.home.claims },
  ];

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: theme.palette.background.paper,
        overflow: "hidden",
      }}
    >
      {/* Profile section */}
      <Box sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          src={user.profileImage || undefined}
          sx={{
            width: 48,
            height: 48,
            backgroundColor: theme.palette.secondary.main,
            fontWeight: 700,
          }}
        >
          {user.businessName.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: 700, color: theme.palette.text.primary }}
            noWrap
          >
            {user.businessName}
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.8rem" }} noWrap>
            {user.location?.displayName}
          </Typography>
        </Box>
      </Box>

      {/* Manage Listings link */}
      <Box sx={{ px: 2.5, pb: 2 }}>
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.secondary.main,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "0.85rem",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {AppText.home.manageListings}
        </Typography>
      </Box>

      <Divider />

      {/* Stats */}
      <Box sx={{ display: "flex", py: 2 }}>
        {stats.map((stat) => (
          <Box key={stat.label} sx={{ flex: 1, textAlign: "center" }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}
            >
              {stat.value}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}
            >
              {stat.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default BusinessSidebar;
