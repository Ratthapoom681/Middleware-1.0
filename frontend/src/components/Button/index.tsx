import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
};

export function Button({ children, style, variant = "primary", ...props }: ButtonProps) {
  const baseColor = variant === "primary" ? "#2563eb" : "#f3f4f6";
  const textColor = variant === "primary" ? "#fff" : "#111827";

  return (
    <button
      {...props}
      style={{
        background: baseColor,
        border: "1px solid transparent",
        borderRadius: 6,
        color: textColor,
        cursor: "pointer",
        font: "inherit",
        padding: "8px 12px",
        ...style
      }}
    >
      {children}
    </button>
  );
}

