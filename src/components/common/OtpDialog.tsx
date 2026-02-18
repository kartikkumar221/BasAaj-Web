import { useState, useRef, useEffect, useCallback } from "react";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "@mui/material/styles";
import { AppText } from "../../constants";
import { AppButton } from "./index";

interface OtpDialogProps {
  open: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  mobile: string;
}

const OTP_LENGTH = 6;
const RESEND_TIMER = 30;

const OtpDialog = ({ open, onClose, onVerify, onResend, mobile }: OtpDialogProps) => {
  const theme = useTheme();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(RESEND_TIMER);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setTimer(RESEND_TIMER);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (open) {
      setOtp(Array(OTP_LENGTH).fill(""));
      setError("");
      startTimer();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, startTimer]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const otpValue = otp.join("");
  const isValid = otpValue.length === OTP_LENGTH;

  const handleVerify = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      await onVerify(otpValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : AppText.common.error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await onResend();
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : AppText.common.error);
    }
  };

  // Display mobile without the +91 prefix if it starts with it
  const displayMobile = mobile.startsWith("+91") ? mobile.slice(3) : mobile;

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
            mb: 1,
            mt: 1,
          }}
        >
          {AppText.otp.title}
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.secondary, mb: 4 }}
        >
          {AppText.otp.subtitle}{" "}
          <Box component="span" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
            +91 {displayMobile}
          </Box>
        </Typography>

        {/* OTP input boxes */}
        <Box
          sx={{ display: "flex", gap: { xs: 1, sm: 1.5 }, mb: 2, justifyContent: "center" }}
          onPaste={handlePaste}
        >
          {otp.map((digit, index) => (
            <Box
              key={index}
              component="input"
              ref={(el: HTMLInputElement | null) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              disabled={loading}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange(index, e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                handleKeyDown(index, e)
              }
              sx={{
                width: { xs: 40, sm: 48 },
                height: { xs: 48, sm: 56 },
                textAlign: "center",
                fontSize: "1.5rem",
                fontWeight: 600,
                border: `2px solid ${
                  digit
                    ? theme.palette.secondary.main
                    : theme.palette.grey[300]
                }`,
                borderRadius: 1.5,
                outline: "none",
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.paper,
                transition: "border-color 0.2s",
                "&:focus": {
                  borderColor: theme.palette.secondary.main,
                  boxShadow: `0 0 0 2px ${theme.palette.secondary.light}40`,
                },
              }}
            />
          ))}
        </Box>

        {error && (
          <Typography
            variant="body2"
            sx={{ color: theme.palette.error.main, textAlign: "center", mb: 2 }}
          >
            {error}
          </Typography>
        )}

        <Box sx={{ mt: 2 }}>
          <AppButton
            label={loading ? "" : AppText.otp.verify}
            fullWidth
            disabled={!isValid || loading}
            onClick={handleVerify}
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

        <Box sx={{ textAlign: "center", mt: 3 }}>
          {canResend ? (
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {AppText.otp.didntReceive}{" "}
              <Box
                component="span"
                onClick={handleResend}
                sx={{
                  color: theme.palette.secondary.main,
                  fontWeight: 600,
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {AppText.otp.resend}
              </Box>
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              {AppText.otp.resend} in{" "}
              <Box component="span" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                00:{timer.toString().padStart(2, "0")}
              </Box>
            </Typography>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};

export default OtpDialog;
