import { useState, useRef } from "react";
import Card from "@mui/material/Card";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import EventIcon from "@mui/icons-material/Event";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useTheme } from "@mui/material/styles";
import { toggleReaction } from "../../services/dealService";
import { useAuth } from "../../context/AuthContext";

export interface OfferCardData {
  id?: string;
  businessName: string;
  title: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  discount: string;
  validity: string;
  location: string;
  distance: string;
  phone: string;
  views: number;
  image: string;
  images?: string[];
  likeCount?: number;
  dislikeCount?: number;
  userReaction?: string | null; // "LIKE", "DISLIKE", or null
}

const formatViews = (count: number): string => {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K views`;
  return `${count} views`;
};

// ── Module-level reaction cache ──
// Persists across component unmount/remount (page navigations) within the same session
interface CachedReaction {
  reaction: string | null;
  likes: number;
  dislikes: number;
}
const reactionCache = new Map<string, CachedReaction>();

const OfferCard = ({ offer }: { offer: OfferCardData }) => {
  const theme = useTheme();
  const { isLoggedIn, openLogin } = useAuth();

  // Check cache first, then fall back to props from API
  const cached = offer.id ? reactionCache.get(offer.id) : undefined;
  const [reaction, setReaction] = useState<string | null>(cached?.reaction ?? offer.userReaction ?? null);
  const [likes, setLikes] = useState(cached?.likes ?? offer.likeCount ?? 0);
  const [dislikes, setDislikes] = useState(cached?.dislikes ?? offer.dislikeCount ?? 0);
  const [loading, setLoading] = useState(false);

  // Image carousel
  const imgList = offer.images && offer.images.length > 0
    ? offer.images
    : offer.image
    ? [offer.image]
    : [];
  const [activeImg, setActiveImg] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToImg = (idx: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: idx * scrollRef.current.clientWidth, behavior: "smooth" });
    }
    setActiveImg(idx);
  };

  const handleImgScroll = () => {
    if (scrollRef.current) {
      const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
      setActiveImg(idx);
    }
  };

  const handleReaction = async (type: "LIKE" | "DISLIKE") => {
    if (!isLoggedIn) { openLogin(); return; }
    if (!offer.id || loading) return;

    // Optimistic update
    const prevReaction = reaction;
    const prevLikes = likes;
    const prevDislikes = dislikes;
    const newReaction = reaction === type ? null : type;

    setReaction(newReaction);
    // Adjust counts optimistically
    if (type === "LIKE") {
      setLikes((l) => newReaction === "LIKE" ? l + 1 : l - 1);
      if (prevReaction === "DISLIKE") setDislikes((d) => d - 1);
    } else {
      setDislikes((d) => newReaction === "DISLIKE" ? d + 1 : d - 1);
      if (prevReaction === "LIKE") setLikes((l) => l - 1);
    }

    setLoading(true);
    try {
      const res = await toggleReaction(offer.id, type);
      // Use server response as source of truth
      setReaction(res.userReaction);
      setLikes(res.likeCount);
      setDislikes(res.dislikeCount);
      // Cache so it persists across navigations
      reactionCache.set(offer.id, {
        reaction: res.userReaction,
        likes: res.likeCount,
        dislikes: res.dislikeCount,
      });
    } catch {
      // Revert to previous state on failure
      setReaction(prevReaction);
      setLikes(prevLikes);
      setDislikes(prevDislikes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        transition: "box-shadow 0.2s",
        "&:hover": {
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        },
      }}
    >
      {/* Image carousel */}
      <Box
        sx={{ position: "relative", "&:hover .img-nav": { opacity: 1 } }}
      >
        {/* Scrollable strip */}
        <Box
          ref={scrollRef}
          onScroll={handleImgScroll}
          sx={{
            display: "flex",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            height: 200,
          }}
        >
          {imgList.length > 0 ? imgList.map((src, i) => (
            <Box
              key={i}
              component="img"
              src={src}
              alt={`${offer.title} ${i + 1}`}
              sx={{
                flexShrink: 0,
                width: "100%",
                height: 200,
                objectFit: "cover",
                scrollSnapAlign: "start",
              }}
            />
          )) : (
            <Box sx={{ width: "100%", height: 200, backgroundColor: theme.palette.grey[200], flexShrink: 0 }} />
          )}
        </Box>

        {/* Discount badge */}
        {offer.discount && (
          <Box
            sx={{
              position: "absolute",
              bottom: imgList.length > 1 ? 28 : 12,
              left: 12,
              backgroundColor: "#E53935",
              color: theme.palette.common.white,
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              fontSize: "0.75rem",
              fontWeight: 700,
              zIndex: 1,
            }}
          >
            {offer.discount}
          </Box>
        )}

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

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {/* Business name + prices */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: theme.palette.success.main,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.8rem" }}>
              {offer.businessName}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {offer.originalPrice > 0 && (
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.disabled,
                  textDecoration: "line-through",
                  fontSize: "0.8rem",
                }}
              >
                {"\u20B9"}{offer.originalPrice}
              </Typography>
            )}
            {offer.discountedPrice > 0 && (
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.primary,
                  fontWeight: 700,
                  fontSize: "0.95rem",
                }}
              >
                {"\u20B9"}{offer.discountedPrice}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: "1rem",
            color: theme.palette.text.primary,
            mb: 0.5,
            lineHeight: 1.3,
          }}
        >
          {offer.title}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: "0.8rem",
            lineHeight: 1.5,
            mb: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {offer.description}
        </Typography>

        {/* Validity + Phone */}
        {(offer.validity || offer.phone) && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            {offer.validity && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <EventIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}>
                  Valid: {offer.validity}
                </Typography>
              </Box>
            )}
            {offer.phone && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PhoneIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}>
                  {offer.phone}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Location */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}>
          <LocationOnIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}>
            {offer.location}{offer.distance ? ` - ${offer.distance}` : ""}
          </Typography>
        </Box>

        <Divider />

        {/* Like / Dislike + Views */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {/* Like button */}
            <Box
              onClick={() => handleReaction("LIKE")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                borderRadius: 5,
                cursor: loading ? "default" : "pointer",
                backgroundColor: reaction === "LIKE"
                  ? `${theme.palette.success.main}14`
                  : "transparent",
                border: `1px solid ${reaction === "LIKE" ? theme.palette.success.main : "transparent"}`,
                transition: "all 0.2s",
                "&:hover": loading ? {} : {
                  backgroundColor: reaction === "LIKE"
                    ? `${theme.palette.success.main}20`
                    : theme.palette.action.hover,
                },
              }}
            >
              {reaction === "LIKE"
                ? <ThumbUpIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                : <ThumbUpOutlinedIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
              }
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: reaction === "LIKE" ? 600 : 400,
                  color: reaction === "LIKE" ? theme.palette.success.main : theme.palette.text.secondary,
                }}
              >
                {reaction === "LIKE" ? "Liked" : "Like"}{likes > 0 ? ` (${likes})` : ""}
              </Typography>
            </Box>

            {/* Dislike button */}
            <Box
              onClick={() => handleReaction("DISLIKE")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                borderRadius: 5,
                cursor: loading ? "default" : "pointer",
                backgroundColor: reaction === "DISLIKE"
                  ? `${theme.palette.error.main}14`
                  : "transparent",
                border: `1px solid ${reaction === "DISLIKE" ? theme.palette.error.main : "transparent"}`,
                transition: "all 0.2s",
                "&:hover": loading ? {} : {
                  backgroundColor: reaction === "DISLIKE"
                    ? `${theme.palette.error.main}20`
                    : theme.palette.action.hover,
                },
              }}
            >
              {reaction === "DISLIKE"
                ? <ThumbDownIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
                : <ThumbDownOutlinedIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
              }
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: reaction === "DISLIKE" ? 600 : 400,
                  color: reaction === "DISLIKE" ? theme.palette.error.main : theme.palette.text.secondary,
                }}
              >
                {reaction === "DISLIKE" ? "Disliked" : "Dislike"}{dislikes > 0 ? ` (${dislikes})` : ""}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <VisibilityIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}>
              {formatViews(offer.views)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Card>
  );
};

export default OfferCard;
