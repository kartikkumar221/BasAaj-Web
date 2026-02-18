import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";

interface OfferCardProps {
  title: string;
  location: string;
  discount: string;
  image: string;
}

const OfferCard = ({ discount, image, title }: OfferCardProps) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        position: "relative",
        borderRadius: 2,
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        },
      }}
    >
      <CardMedia
        component="img"
        height="220"
        image={image}
        alt={title}
        sx={{ objectFit: "cover" }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          left: 16,
        }}
      >
        <Chip
          label={discount}
          size="small"
          sx={{
            backgroundColor: theme.palette.secondary.main,
            color: theme.palette.common.white,
            fontWeight: 700,
            fontSize: "0.8rem",
            px: 0.5,
          }}
        />
      </Box>
    </Card>
  );
};

export default OfferCard;
