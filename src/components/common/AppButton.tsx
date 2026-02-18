import Button, { type ButtonProps } from "@mui/material/Button";

interface AppButtonProps extends ButtonProps {
  label: string;
}

const AppButton = ({ label, variant = "contained", ...rest }: AppButtonProps) => {
  return (
    <Button variant={variant} {...rest}>
      {label}
    </Button>
  );
};

export default AppButton;
