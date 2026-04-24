import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mealflo",
    short_name: "mealflo",
    description: "Volunteer-led food delivery operations demo.",
    background_color: "#fffdf0",
    theme_color: "#fae278",
    display: "standalone",
    start_url: "/driver",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
