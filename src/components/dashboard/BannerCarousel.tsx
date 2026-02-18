import Box from "@mui/material/Box";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { AppText } from "../../constants";

const BannerCarousel = () => {
  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        "& .swiper-pagination-bullet": {
          backgroundColor: "#fff",
          opacity: 0.6,
        },
        "& .swiper-pagination-bullet-active": {
          backgroundColor: "#fff",
          opacity: 1,
        },
      }}
    >
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        spaceBetween={16}
        style={{ borderRadius: 12, overflow: "hidden" }}
      >
        {AppText.banners.map((banner, index) => (
          <SwiperSlide key={index}>
            <Box
              component="img"
              src={banner.image}
              alt={banner.alt}
              sx={{
                width: "100%",
                height: { xs: 180, sm: 250, md: 320 },
                objectFit: "cover",
                display: "block",
              }}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  );
};

export default BannerCarousel;
