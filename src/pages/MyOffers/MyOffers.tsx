import { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import EventIcon from "@mui/icons-material/Event";
import AddIcon from "@mui/icons-material/Add";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getMyDeals,
  getMyStats,
  deleteDeal,
  type DealResponse,
  type DealStatsResponse,
} from "../../services/dealService";
import { AppButton } from "../../components/common";

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const stateColor = (state: string) => {
  switch (state?.toUpperCase()) {
    case "ACTIVE":
      return "success";
    case "EXPIRED":
    case "CLOSED":
      return "error";
    case "PAUSED":
      return "warning";
    case "DRAFT":
      return "default";
    default:
      return "default";
  }
};

const MyOffers = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const [deals, setDeals] = useState<DealResponse[]>([]);
  const [stats, setStats] = useState<DealStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(
    !!(routeState as { success?: boolean } | null)?.success
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [dealsPage, statsData] = await Promise.all([
          getMyDeals(),
          getMyStats(),
        ]);
        if (!cancelled) {
          setDeals(dealsPage.content);
          setStats(statsData);
        }
      } catch {
        // silently fail – empty state will show
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDeal(deleteTarget);
      setDeals((prev) => prev.filter((d) => d.id !== deleteTarget));
    } catch {
      // ignore
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
          My Offers
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
          Manage all your posted offers
        </Typography>
      </Box>

      {/* Stats cards */}
      {stats && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr 1fr" }, gap: 2, mb: 3 }}>
          <StatCard
            label="Total Deals"
            value={stats.totalDeals}
            icon={<LocalOfferOutlinedIcon sx={{ fontSize: 20 }} />}
          />
          <StatCard
            label="Active"
            value={stats.activeDeals}
            icon={<TrendingUpIcon sx={{ fontSize: 20 }} />}
            color="success"
          />
          <StatCard
            label="Total Views"
            value={stats.totalViews}
            icon={<VisibilityIcon sx={{ fontSize: 20 }} />}
          />
          <StatCard
            label="Total Likes"
            value={stats.totalLikes}
            icon={<ThumbUpOutlinedIcon sx={{ fontSize: 20 }} />}
          />
        </Box>
      )}

      {/* Success alert */}
      {showSuccess && (
        <Alert
          severity="success"
          onClose={() => setShowSuccess(false)}
          sx={{ mb: 3, borderRadius: 1.5 }}
        >
          Your offer has been posted successfully!
        </Alert>
      )}

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: theme.palette.secondary.main }} />
        </Box>
      ) : deals.length === 0 ? (
        /* Empty state */
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
            No offers yet
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 3 }}>
            Create your first offer and start reaching customers near you.
          </Typography>
          <AppButton
            label="Create Offer"
            startIcon={<AddIcon />}
            onClick={() => navigate("/post-offer")}
            sx={{
              backgroundColor: theme.palette.secondary.main,
              color: theme.palette.common.white,
              px: 3,
              fontWeight: 600,
              "&:hover": { backgroundColor: theme.palette.secondary.dark },
            }}
          />
        </Box>
      ) : (
        /* Deal grid 3 per row */
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
            gap: 3,
          }}
        >
          {deals.map((deal) => {
            const discount =
              deal.discountValue ??
              (deal.originalPrice && deal.originalPrice > 0 && deal.dealPrice != null
                ? Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100)
                : 0);

            return (
              <Card
                key={deal.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: "none",
                  "&:hover": { boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
                }}
              >
                {/* Image carousel */}
                <ImageCarousel deal={deal} />

                {/* Content */}
                <Box sx={{ p: 2, display: "flex", flexDirection: "column", flexGrow: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body1" noWrap sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                        {deal.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {deal.subcategoryName || deal.postType}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0, ml: 1 }}>
                      <Chip
                        label={deal.state || "ACTIVE"}
                        size="small"
                        color={stateColor(deal.state) as "success" | "error" | "warning" | "default"}
                        variant="outlined"
                        sx={{ fontSize: "0.7rem", height: 24 }}
                      />
                      <IconButton size="small" onClick={() => setDeleteTarget(deal.id)} sx={{ color: theme.palette.error.main }}>
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Prices */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    {deal.originalPrice != null && deal.originalPrice > 0 && (
                      <Typography variant="body2" sx={{ color: theme.palette.text.disabled, textDecoration: "line-through" }}>
                        {"\u20B9"}{deal.originalPrice}
                      </Typography>
                    )}
                    {deal.dealPrice != null && deal.dealPrice > 0 && (
                      <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                        {"\u20B9"}{deal.dealPrice}
                      </Typography>
                    )}
                    {discount > 0 && (
                      <Typography variant="caption" sx={{ color: theme.palette.secondary.main, fontWeight: 700 }}>
                        {discount}% OFF
                      </Typography>
                    )}
                  </Box>

                  {/* Validity */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    <EventIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                      {formatDate(deal.startTime)} - {formatDate(deal.expiryTime)}
                    </Typography>
                  </Box>

                  {/* Stats row */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: "auto", pt: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <VisibilityIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {deal.viewCount} views
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <ThumbUpOutlinedIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {deal.likeCount}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <ThumbDownOutlinedIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                        {deal.dislikeCount}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 340 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Delete Offer</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: theme.palette.text.secondary }}>
            Are you sure you want to delete this offer? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={deleting}
            variant="contained"
            sx={{
              backgroundColor: theme.palette.error.main,
              fontWeight: 600,
              "&:hover": { backgroundColor: theme.palette.error.dark },
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ImageCarousel = ({ deal }: { deal: DealResponse }) => {
  const imgList =
    deal.mediaItems && deal.mediaItems.length > 0
      ? deal.mediaItems
          .filter((m) => !m.type?.toUpperCase().startsWith("VIDEO"))
          .sort((a, b) => a.position - b.position)
          .map((m) => m.url)
      : deal.mediaUrl
      ? [deal.mediaUrl]
      : [];

  const [activeImg, setActiveImg] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (imgList.length === 0) return null;

  const scrollToImg = (idx: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: idx * scrollRef.current.clientWidth, behavior: "smooth" });
    }
    setActiveImg(idx);
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
      setActiveImg(idx);
    }
  };

  return (
    <Box sx={{ position: "relative", "&:hover .img-nav": { opacity: 1 } }}>
      {/* Scrollable strip */}
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          height: { xs: 140, sm: 180 },
        }}
      >
        {imgList.map((src, i) => (
          <Box
            key={i}
            component="img"
            src={src}
            alt={`${deal.title} ${i + 1}`}
            sx={{
              flexShrink: 0,
              width: "100%",
              height: { xs: 140, sm: 180 },
              objectFit: "cover",
              scrollSnapAlign: "start",
            }}
          />
        ))}
      </Box>

      {/* Dot indicators */}
      {imgList.length > 1 && (
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 0.5,
            zIndex: 1,
          }}
        >
          {imgList.map((_, i) => (
            <Box
              key={i}
              onClick={() => scrollToImg(i)}
              sx={{
                width: i === activeImg ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeImg ? "#fff" : "rgba(255,255,255,0.55)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            />
          ))}
        </Box>
      )}

      {/* Prev arrow */}
      {imgList.length > 1 && activeImg > 0 && (
        <Box
          className="img-nav"
          onClick={() => scrollToImg(activeImg - 1)}
          sx={{
            opacity: 0,
            transition: "opacity 0.2s",
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            backgroundColor: "rgba(0,0,0,0.35)",
            borderRadius: "50%",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronLeftIcon sx={{ fontSize: 20, color: "#fff" }} />
        </Box>
      )}

      {/* Next arrow */}
      {imgList.length > 1 && activeImg < imgList.length - 1 && (
        <Box
          className="img-nav"
          onClick={() => scrollToImg(activeImg + 1)}
          sx={{
            opacity: 0,
            transition: "opacity 0.2s",
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            backgroundColor: "rgba(0,0,0,0.35)",
            borderRadius: "50%",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronRightIcon sx={{ fontSize: 20, color: "#fff" }} />
        </Box>
      )}
    </Box>
  );
};

const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        p: { xs: 1.5, sm: 2 },
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box sx={{ color: color === "success" ? theme.palette.success.main : theme.palette.text.secondary }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

export default MyOffers;
