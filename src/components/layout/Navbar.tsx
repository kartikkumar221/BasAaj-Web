import { useState, useEffect, useRef, useMemo } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Popover from "@mui/material/Popover";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AddIcon from "@mui/icons-material/Add";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation as useRouteLocation, useSearchParams } from "react-router-dom";
import { AppText } from "../../constants";
import { AppButton, LocationDialog, LoginDialog, OtpDialog, ProfileSetupDialog } from "../common";
import { useLocation } from "../../context/LocationContext";
import { useAuth } from "../../context/AuthContext";
import { getAllSubCategories } from "../../services/formConfigService";

interface NavCategory {
  label: string;
  parentCode: string;
  subcategories: { code: string; name: string }[];
}

const Navbar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useRouteLocation();
  const [searchParams] = useSearchParams();
  const showFilters = pathname === "/" || pathname === "";
  const { location, isLoading } = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const {
    isLoggedIn, user,
    loginOpen, otpOpen, profileSetupOpen, mobile,
    pendingRedirect,
    openLogin, closeLogin,
    sendOtp, verifyOtp, closeOtp,
    closeProfileSetup, completeProfileSetup,
    clearPendingRedirect,
  } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [catAnchor, setCatAnchor] = useState<null | HTMLElement>(null);
  const [activeCatIndex, setActiveCatIndex] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");

  // Backend subcategories grouped by parent
  const [navCategories, setNavCategories] = useState<NavCategory[]>([]);

  useEffect(() => {
    getAllSubCategories()
      .then((data) => {
        const map = new Map<string, NavCategory>();
        data.forEach((sub) => {
          if (!map.has(sub.parentCategory)) {
            map.set(sub.parentCategory, {
              label: sub.parentCategory,
              parentCode: sub.parentCode,
              subcategories: [],
            });
          }
          map.get(sub.parentCategory)!.subcategories.push({
            code: sub.code,
            name: sub.name,
          });
        });
        setNavCategories(Array.from(map.values()));
      })
      .catch(() => {});
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Redirect after login completes
  useEffect(() => {
    if (isLoggedIn && pendingRedirect) {
      navigate(pendingRedirect);
      clearPendingRedirect();
    }
  }, [isLoggedIn, pendingRedirect, navigate, clearPendingRedirect]);

  const locationLabel = isLoading
    ? AppText.location.detecting
    : location?.displayName || AppText.navbar.defaultLocation;

  const searchPlaceholder = isLoggedIn && user?.location?.city
    ? AppText.home.searchWithin.replace("{location}", user.location.city)
    : AppText.navbar.searchPlaceholder;

  type Suggestion =
    | { kind: "category"; label: string }
    | { kind: "subcategory"; label: string; parentLabel: string };

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Suggestion[] = [];
    for (const cat of navCategories) {
      if (cat.label.toLowerCase().includes(q)) {
        results.push({ kind: "category", label: cat.label });
      }
      for (const sub of cat.subcategories) {
        if (sub.name.toLowerCase().includes(q)) {
          results.push({ kind: "subcategory", label: sub.name, parentLabel: cat.label });
        }
      }
    }
    return results.slice(0, 7);
  }, [searchQuery, navCategories]);

  const handleSelectSuggestion = (s: Suggestion) => {
    setShowSuggestions(false);
    setSearchQuery(s.label);
    if (s.kind === "subcategory") {
      navigate(`/?q=${encodeURIComponent(s.label)}`);
    } else {
      navigate(`/?category=${encodeURIComponent(s.label)}`);
    }
  };

  const handleCatClick = (e: React.MouseEvent<HTMLElement>, index: number) => {
    setCatAnchor(e.currentTarget);
    setActiveCatIndex(index);
    const cat = navCategories[index];
    navigate(`/?category=${encodeURIComponent(cat.label)}`);
    setSearchQuery("");
  };

  const handleCatClose = () => {
    setCatAnchor(null);
    setActiveCatIndex(null);
  };

  const handleSubcategoryClick = (_subCode: string, subName: string) => {
    if (activeCategory) {
      navigate(
        `/?category=${encodeURIComponent(activeCategory.label)}&subcategory=${encodeURIComponent(subName)}`
      );
      setSearchQuery("");
    }
    handleCatClose();
  };

  const activeCategory =
    activeCatIndex !== null ? navCategories[activeCatIndex] ?? null : null;

  const handleSearch = () => {
    setShowSuggestions(false);
    const q = searchQuery.trim();
    if (q) {
      navigate(`/?q=${encodeURIComponent(q)}`);
    } else {
      navigate("/");
    }
  };

  const handleMobileSearch = () => {
    const q = mobileSearchQuery.trim();
    setDrawerOpen(false);
    if (q) {
      setSearchQuery(q);
      navigate(`/?q=${encodeURIComponent(q)}`);
    }
    setMobileSearchQuery("");
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderTop: `3px solid ${theme.palette.secondary.main}`,
        }}
      >
        {/* Top row */}
        <Toolbar
          disableGutters
          sx={{
            maxWidth: 1200,
            width: "100%",
            mx: "auto",
            px: { xs: 1, sm: 2, md: 3 },
            minHeight: { xs: 56, sm: 68 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Left: Hamburger (mobile) + Logo + Location */}
          <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0, minWidth: { sm: 180 } }}>
            {/* Hamburger – mobile only */}
            <IconButton
              onClick={() => setDrawerOpen(true)}
              sx={{
                display: { xs: "flex", md: "none" },
                mr: -0.5,
                color: theme.palette.text.primary,
              }}
            >
              <MenuIcon />
            </IconButton>

            <Box>
              <Box
                onClick={() => navigate("/")}
                sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    backgroundColor: theme.palette.secondary.main,
                    display: { xs: "none", md: "flex" },
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    sx={{ color: theme.palette.common.white, fontWeight: 700, fontSize: { xs: "0.85rem", sm: "1rem" } }}
                  >
                    B
                  </Typography>
                </Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: theme.palette.text.primary }}
                >
                  {AppText.app.name}
                </Typography>
              </Box>
              {/* Location under logo – hidden on mobile */}
              <Box
                onClick={() => setDialogOpen(true)}
                sx={{
                  display: { xs: "none", sm: "flex" },
                  alignItems: "center",
                  gap: 0.3,
                  cursor: "pointer",
                  mt: 0.75,
                  ml: 0.5,
                  "&:hover": { opacity: 0.8 },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={12} sx={{ color: theme.palette.secondary.main }} />
                ) : (
                  <LocationOnIcon sx={{ fontSize: 14, color: theme.palette.secondary.main }} />
                )}
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.text.secondary, fontWeight: 500, maxWidth: 160 }}
                  noWrap
                >
                  {locationLabel}
                </Typography>
                <KeyboardArrowDownIcon sx={{ fontSize: 14, color: theme.palette.text.disabled }} />
              </Box>
            </Box>
          </Box>

          {/* Center: Search Bar – desktop only */}
          <Box
            ref={searchContainerRef}
            sx={{
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              position: "relative",
              width: 520,
              maxWidth: "45%",
              flexShrink: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: showSuggestions && (suggestions.length > 0 || searchQuery.trim()) ? "4px 4px 0 0" : 1,
                px: 1.5,
                py: 0.5,
                "&:hover": { borderColor: theme.palette.grey[400] },
                "&:focus-within": { borderColor: theme.palette.primary.main },
              }}
            >
              <SearchIcon
                onClick={handleSearch}
                sx={{ color: theme.palette.text.secondary, mr: 1, fontSize: 20, cursor: "pointer" }}
              />
              <InputBase
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                  if (e.key === "Escape") setShowSuggestions(false);
                }}
                sx={{
                  color: theme.palette.text.primary,
                  width: "100%",
                  fontSize: "0.85rem",
                  "& ::placeholder": { color: theme.palette.text.secondary, opacity: 1 },
                }}
              />
              {searchQuery && (
                <CloseIcon
                  onClick={() => { setSearchQuery(""); setShowSuggestions(false); navigate("/"); }}
                  sx={{
                    fontSize: 18,
                    color: theme.palette.text.secondary,
                    cursor: "pointer",
                    ml: 0.5,
                    "&:hover": { color: theme.palette.text.primary },
                  }}
                />
              )}
            </Box>

            {/* Suggestions dropdown */}
            {showSuggestions && searchQuery.trim() && (
              <Paper
                elevation={4}
                sx={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 1400,
                  borderRadius: "0 0 6px 6px",
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                <Box
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSearch}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
                    cursor: "pointer",
                    "&:hover": { backgroundColor: theme.palette.grey[50] },
                  }}
                >
                  <SearchIcon sx={{ fontSize: 18, color: theme.palette.text.secondary, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
                    Search for&nbsp;<strong>"{searchQuery.trim()}"</strong>
                  </Typography>
                </Box>

                {suggestions.length > 0 && <Divider />}

                {suggestions.map((s, i) => (
                  <Box
                    key={i}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(s)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2,
                      py: 1,
                      cursor: "pointer",
                      "&:hover": { backgroundColor: theme.palette.grey[50] },
                    }}
                  >
                    {s.kind === "category" ? (
                      <CategoryOutlinedIcon sx={{ fontSize: 17, color: theme.palette.text.secondary, flexShrink: 0 }} />
                    ) : (
                      <LocalOfferOutlinedIcon sx={{ fontSize: 17, color: theme.palette.text.secondary, flexShrink: 0 }} />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary, lineHeight: 1.3 }}>
                        {s.label}
                      </Typography>
                      {s.kind === "subcategory" && (
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                          in {s.parentLabel}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>

          {/* Right: Desktop buttons + Avatar */}
          {isLoggedIn ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 }, flexShrink: 0 }}>
              {/* Post Offer – desktop only */}
              <AppButton
                label={AppText.home.postOffer}
                size="small"
                startIcon={<AddIcon />}
                onClick={() => navigate("/post-offer")}
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  backgroundColor: theme.palette.secondary.main,
                  color: theme.palette.common.white,
                  px: 2,
                  fontWeight: 600,
                  "&:hover": { backgroundColor: theme.palette.secondary.dark },
                }}
              />
              <Avatar
                src={user?.profileImage || undefined}
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  width: { xs: 32, sm: 36 },
                  height: { xs: 32, sm: 36 },
                  backgroundColor: theme.palette.secondary.main,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                }}
              >
                {user?.businessName?.charAt(0).toUpperCase()}
              </Avatar>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { mt: 1, minWidth: 180, borderRadius: 1.5 } } }}
              >
                <MenuItem onClick={() => { setAnchorEl(null); navigate("/profile"); }}>
                  <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
                  My Profile
                </MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); navigate("/my-offers"); }}>
                  <ListItemIcon><LocalOfferOutlinedIcon fontSize="small" /></ListItemIcon>
                  My Offers
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
              {/* Post Offer – desktop only */}
              <AppButton
                label={AppText.home.postOffer}
                size="small"
                startIcon={<AddIcon />}
                onClick={() => openLogin("/post-offer")}
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  backgroundColor: theme.palette.secondary.main,
                  color: theme.palette.common.white,
                  px: 2,
                  fontWeight: 600,
                  "&:hover": { backgroundColor: theme.palette.secondary.dark },
                }}
              />
              <AppButton
                label="Login"
                size="small"
                onClick={() => openLogin()}
                sx={{
                  border: `1.5px solid ${theme.palette.secondary.main}`,
                  color: theme.palette.secondary.main,
                  px: 2,
                  fontWeight: 600,
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: `${theme.palette.secondary.main}10`,
                  },
                }}
              />
            </Box>
          )}
        </Toolbar>

        {/* Category filter bar – only on dashboard */}
        {showFilters && (
          <Box
            sx={{
              borderTop: `1px solid ${theme.palette.divider}`,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: { xs: "none", md: "block" },
            }}
          >
            <Box
              sx={{
                maxWidth: 1200,
                width: "100%",
                mx: "auto",
                px: { xs: 2, md: 3 },
                display: "flex",
                alignItems: "center",
                overflowX: "auto",
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
              }}
            >
              {navCategories.map((cat, index) => {
                const isActive = activeCatIndex === index && Boolean(catAnchor);
                return (
                  <Box
                    key={cat.label}
                    onClick={(e) => handleCatClick(e, index)}
                    sx={{
                      py: 1.5,
                      px: { xs: 1.5, sm: 2 },
                      cursor: "pointer",
                      flexShrink: 0,
                      borderBottom: isActive
                        ? `2px solid ${theme.palette.secondary.main}`
                        : "2px solid transparent",
                      transition: "border-color 0.2s",
                      "&:hover": {
                        borderBottom: `2px solid ${theme.palette.grey[400]}`,
                      },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: isActive
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary,
                        fontWeight: isActive ? 600 : 400,
                        fontSize: "0.85rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cat.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Subcategory dropdown popover */}
        {showFilters && (
          <Popover
            open={Boolean(catAnchor) && activeCategory !== null}
            anchorEl={catAnchor}
            onClose={handleCatClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            slotProps={{
              paper: {
                sx: {
                  mt: 0.5,
                  borderRadius: 1.5,
                  minWidth: 200,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                },
              },
            }}
          >
            {activeCategory?.subcategories.map((sub) => (
              <MenuItem
                key={sub.code}
                onClick={() => handleSubcategoryClick(sub.code, sub.name)}
                sx={{
                  fontSize: "0.85rem",
                  py: 1,
                  "&:hover": {
                    backgroundColor: theme.palette.grey[100],
                    color: theme.palette.secondary.main,
                  },
                }}
              >
                {sub.name}
              </MenuItem>
            ))}
          </Popover>
        )}
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: { width: 280, pt: 1 },
          },
        }}
      >
        {/* Drawer header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                backgroundColor: theme.palette.secondary.main,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ color: theme.palette.common.white, fontWeight: 700, fontSize: "0.85rem" }}>
                B
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              {AppText.app.name}
            </Typography>
          </Box>
          <IconButton onClick={() => setDrawerOpen(false)} size="small">
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        <Divider />

        {/* Mobile search */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              px: 1.5,
              py: 0.5,
              "&:focus-within": { borderColor: theme.palette.secondary.main },
            }}
          >
            <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 1, fontSize: 20 }} />
            <InputBase
              placeholder="Search offers..."
              value={mobileSearchQuery}
              onChange={(e) => setMobileSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleMobileSearch(); }}
              sx={{ width: "100%", fontSize: "0.85rem" }}
            />
          </Box>
        </Box>

        {/* Location */}
        <Box
          onClick={() => { setDrawerOpen(false); setDialogOpen(true); }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.5,
            cursor: "pointer",
            "&:hover": { backgroundColor: theme.palette.grey[50] },
          }}
        >
          {isLoading ? (
            <CircularProgress size={16} sx={{ color: theme.palette.secondary.main }} />
          ) : (
            <LocationOnIcon sx={{ fontSize: 20, color: theme.palette.secondary.main }} />
          )}
          <Box>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: "block", lineHeight: 1.2 }}>
              Your Location
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
              {locationLabel}
            </Typography>
          </Box>
          <KeyboardArrowDownIcon sx={{ fontSize: 18, color: theme.palette.text.disabled, ml: "auto" }} />
        </Box>

        <Divider />

        {/* Post Offer button */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <AppButton
            label={AppText.home.postOffer}
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setDrawerOpen(false);
              if (isLoggedIn) {
                navigate("/post-offer");
              } else {
                openLogin("/post-offer");
              }
            }}
            sx={{
              backgroundColor: theme.palette.secondary.main,
              color: theme.palette.common.white,
              width: "100%",
              fontWeight: 600,
              "&:hover": { backgroundColor: theme.palette.secondary.dark },
            }}
          />
        </Box>

        <Divider />

        {/* Categories in drawer */}
        {navCategories.length > 0 && (
          <>
            <Typography
              variant="caption"
              sx={{ px: 2, pt: 1.5, pb: 0.5, color: theme.palette.text.secondary, fontWeight: 600, display: "block" }}
            >
              Categories
            </Typography>
            <List disablePadding sx={{ maxHeight: 300, overflowY: "auto" }}>
              {navCategories.map((cat) => (
                <ListItemButton
                  key={cat.label}
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate(`/?category=${encodeURIComponent(cat.label)}`);
                  }}
                  sx={{ py: 0.75, px: 2 }}
                >
                  <ListItemText
                    primary={cat.label}
                    primaryTypographyProps={{ fontSize: "0.85rem", color: theme.palette.text.primary }}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Drawer>

      <LocationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <LoginDialog open={loginOpen} onClose={closeLogin} onSendOtp={sendOtp} />
      <OtpDialog
        open={otpOpen}
        onClose={closeOtp}
        onVerify={verifyOtp}
        onResend={() => sendOtp(mobile)}
        mobile={mobile}
      />
      <ProfileSetupDialog
        open={profileSetupOpen}
        onClose={closeProfileSetup}
        onComplete={completeProfileSetup}
      />
    </>
  );
};

export default Navbar;
