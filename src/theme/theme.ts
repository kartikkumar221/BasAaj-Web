import { createTheme } from "@mui/material/styles";
import { colors } from "./colors";
import { typography } from "./typography";
import { spacing } from "./spacing";

const theme = createTheme({
  palette: {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    text: colors.text,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
    divider: colors.divider,
  },
  typography,
  spacing: spacing.base,
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 24px",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        },
      },
    },
  },
});

export default theme;
