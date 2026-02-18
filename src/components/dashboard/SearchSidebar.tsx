import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useTheme } from "@mui/material/styles";
import { getAllSubCategories } from "../../services/formConfigService";

interface CategoryGroup {
  label: string;        // parentCategory name
  parentCode: string;
  subcategories: { code: string; name: string }[];
}

interface SearchSidebarProps {
  selectedCategory: string;
  selectedSubcategory: string;
  minPrice: string;
  maxPrice: string;
  onCategoryChange: (category: string, subcategory?: string) => void;
  onPriceGo: (min: string, max: string) => void;
}

const SearchSidebar = ({
  selectedCategory,
  selectedSubcategory,
  minPrice,
  maxPrice,
  onCategoryChange,
  onPriceGo,
}: SearchSidebarProps) => {
  const theme = useTheme();
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(selectedCategory || null);
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  useEffect(() => { setLocalMin(minPrice); }, [minPrice]);
  useEffect(() => { setLocalMax(maxPrice); }, [maxPrice]);

  // Sync expanded panel when selectedCategory changes externally
  useEffect(() => {
    if (selectedCategory) setExpandedCat(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    getAllSubCategories()
      .then((data) => {
        const map = new Map<string, CategoryGroup>();
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
        setCategoryGroups(Array.from(map.values()));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCatToggle = (catLabel: string) => {
    const next = expandedCat === catLabel ? null : catLabel;
    setExpandedCat(next);
    onCategoryChange(catLabel);
  };

  return (
    <Box>
      {/* Categories */}
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 1 }}
      >
        All Categories
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" height={36} />
          ))}
        </Box>
      ) : (
        <List disablePadding dense>
          {categoryGroups.map((group) => {
            const isActive = selectedCategory === group.label;
            const isExpanded = expandedCat === group.label;
            return (
              <Box key={group.label}>
                <ListItemButton
                  onClick={() => handleCatToggle(group.label)}
                  sx={{
                    py: 0.75,
                    px: 1,
                    borderRadius: 1,
                    backgroundColor: isActive
                      ? `${theme.palette.secondary.main}10`
                      : "transparent",
                  }}
                >
                  <ListItemText
                    primary={group.label}
                    primaryTypographyProps={{
                      fontSize: "0.85rem",
                      fontWeight: isActive ? 700 : 400,
                      color: isActive
                        ? theme.palette.secondary.main
                        : theme.palette.text.primary,
                    }}
                  />
                  {isExpanded ? (
                    <ExpandLess sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                  ) : (
                    <ExpandMore sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                  )}
                </ListItemButton>

                <Collapse in={isExpanded}>
                  <List disablePadding dense>
                    {group.subcategories.map((sub) => {
                      const isSubActive = isActive && selectedSubcategory === sub.name;
                      return (
                        <ListItemButton
                          key={sub.code}
                          onClick={() => onCategoryChange(group.label, sub.name)}
                          sx={{ py: 0.5, pl: 3.5, borderRadius: 1 }}
                        >
                          <ListItemText
                            primary={sub.name}
                            primaryTypographyProps={{
                              fontSize: "0.8rem",
                              fontWeight: isSubActive ? 600 : 400,
                              color: isSubActive
                                ? theme.palette.secondary.main
                                : theme.palette.text.secondary,
                            }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Collapse>
              </Box>
            );
          })}
        </List>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Filters */}
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 1.5 }}
      >
        Filters
      </Typography>

      {/* Price Range */}
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 1 }}
      >
        Price range
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <TextField
          size="small"
          placeholder="Min"
          type="number"
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { min: 0 } }}
        />
        <Typography variant="body2" sx={{ color: theme.palette.text.disabled }}>
          to
        </Typography>
        <TextField
          size="small"
          placeholder="Max"
          type="number"
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { min: 0 } }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={() => onPriceGo(localMin, localMax)}
          sx={{
            minWidth: 40,
            fontWeight: 700,
            borderColor: theme.palette.secondary.main,
            color: theme.palette.secondary.main,
            "&:hover": {
              borderColor: theme.palette.secondary.dark,
              backgroundColor: `${theme.palette.secondary.main}08`,
            },
          }}
        >
          Go
        </Button>
      </Box>

    </Box>
  );
};

export default SearchSidebar;
