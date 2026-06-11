import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#ffffff",
      black: "#000000",
      bg: "#f7f6f3",
      // NOTA: "teal" es históricamente azul (#1B4FBF). Usar "primary" en código
      // nuevo; "teal" se mantiene como alias hasta migrar los usos existentes.
      teal: {
        50: "#EEF3FC",
        100: "#C2D4F0",
        400: "#1B4FBF",
        600: "#153A91",
        800: "#0F2766",
      },
      primary: {
        50: "#EEF3FC",
        100: "#C2D4F0",
        400: "#1B4FBF",
        600: "#153A91",
        800: "#0F2766",
      },
      amber: {
        50: "#FAEEDA",
        100: "#FAC775",
        400: "#BA7517",
        600: "#854F0B",
        800: "#633806",
      },
      blue: {
        50: "#E6F1FB",
        100: "#B5D4F4",
        400: "#378ADD",
        600: "#185FA5",
        800: "#0C447C",
      },
      coral: {
        50: "#FAECE7",
        100: "#F5C4B3",
        400: "#D85A30",
        600: "#993C1D",
      },
      green: {
        50: "#E6F4EC",
        100: "#B5DCC4",
        400: "#1D9E75",
        600: "#0F6E56",
        800: "#085041",
      },
      sky: {
        50: "#E6F1FB",
        100: "#B5D4F4",
        400: "#378ADD",
        600: "#185FA5",
        800: "#0C447C",
      },
      gray: {
        50: "#F1EFE8",
        100: "#D3D1C7",
        200: "#B4B2A9",
        400: "#888780",
        600: "#5F5E5A",
        800: "#444441",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "7px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "24px",
        full: "9999px",
      },
      borderColor: {
        DEFAULT: "rgba(68,68,65,0.12)",
      },
      ringColor: {
        DEFAULT: "#1B4FBF",
      },
    },
  },
  plugins: [],
};
export default config;
