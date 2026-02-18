import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import { AppText } from "../../constants";
import { AppButton } from "./index";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSendOtp: (phone: string) => Promise<void>;
}

const LoginDialog = ({ open, onClose, onSendOtp }: LoginDialogProps) => {
  const theme = useTheme();
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (digits.length <= 10) {
      setMobile(digits);
      setError("");
    }
  };

  const isValid = mobile.length === 10;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      await onSendOtp(`+91${mobile}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : AppText.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
          minHeight: 450,
          width: { xs: "95vw", sm: 680 },
        },
      }}
    >
      {/* Left branded panel */}
      <Box
        sx={{
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.palette.secondary.main,
          width: 260,
          flexShrink: 0,
          px: 4,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 2,
            backgroundColor: theme.palette.common.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 1.5,
          }}
        >
          <Typography
            sx={{
              color: theme.palette.secondary.main,
              fontWeight: 700,
              fontSize: "2rem",
            }}
          >
            B
          </Typography>
        </Box>
        <Typography
          variant="h6"
          sx={{ color: theme.palette.common.white, fontWeight: 700, mb: 2 }}
        >
          {AppText.app.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.common.white, opacity: 0.9, lineHeight: 1.6 }}
        >
          {AppText.login.brandTagline}
        </Typography>
      </Box>

      {/* Right form panel */}
      <Box sx={{ flexGrow: 1, position: "relative", p: { xs: 3, sm: 4 } }}>
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 12, right: 12 }}
          size="small"
        >
          <CloseIcon />
        </IconButton>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 4,
            mt: 1,
          }}
        >
          {AppText.login.title}
        </Typography>

        <TextField
          fullWidth
          variant="standard"
          label={AppText.login.mobileLabel}
          placeholder={AppText.login.mobilePlaceholder}
          value={mobile}
          onChange={handleMobileChange}
          type="tel"
          disabled={loading}
          slotProps={{
            input: {
              startAdornment: (
                <Typography
                  sx={{
                    color: theme.palette.text.primary,
                    fontWeight: 500,
                    mr: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  +91
                </Typography>
              ),
            },
          }}
          sx={{ mb: 2 }}
        />

        {error && (
          <Typography
            variant="body2"
            sx={{ color: theme.palette.error.main, mb: 2 }}
          >
            {error}
          </Typography>
        )}

        <Box sx={{ mt: 2 }}>
          <AppButton
            label={loading ? "" : AppText.login.next}
            fullWidth
            disabled={!isValid || loading}
            onClick={handleSubmit}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
            sx={{
              backgroundColor: isValid && !loading
                ? theme.palette.secondary.main
                : theme.palette.grey[300],
              color: isValid && !loading
                ? theme.palette.common.white
                : theme.palette.text.disabled,
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: 1,
              "&:hover": {
                backgroundColor: isValid && !loading
                  ? theme.palette.secondary.dark
                  : theme.palette.grey[300],
              },
              "&.Mui-disabled": {
                backgroundColor: theme.palette.grey[300],
                color: theme.palette.text.disabled,
              },
            }}
          />
        </Box>
      </Box>
    </Dialog>
  );
};

export default LoginDialog;
