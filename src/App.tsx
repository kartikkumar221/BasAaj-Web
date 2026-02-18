import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import Box from "@mui/material/Box";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { theme } from "./theme";
import { LocationProvider } from "./context/LocationContext";
import { AuthProvider } from "./context/AuthContext";
import { Navbar, AppFooter } from "./components/layout";
import { Dashboard } from "./pages/Dashboard";
import { PostOffer, ReviewOffer } from "./pages/PostOffer";
import { MyOffers } from "./pages/MyOffers";
import { Profile } from "./pages/Profile";
import { ManageAddresses } from "./pages/ManageAddresses";

const AppContent = () => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/post-offer" element={<PostOffer />} />
          <Route path="/review-offer" element={<ReviewOffer />} />
          <Route path="/my-offers" element={<MyOffers />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/manage-addresses" element={<ManageAddresses />} />
        </Routes>
      </Box>
      <AppFooter />
    </Box>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocationProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LocationProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
