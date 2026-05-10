import { useEffect } from "react";
import { useGetSystemSettings } from "@workspace/api-client-react";

const DEFAULT_HUE = 162; // matches LEO teal in :root

/**
 * Apply HSL color variables derived from a single accent hue. The lightness
 * and saturation values mirror the design defaults in `index.css` so a custom
 * hue produces a coherent palette rather than just shifting one swatch.
 */
function applyAccentHue(hue: number) {
  const root = document.documentElement;
  const set = (name: string, value: string) => root.style.setProperty(name, value);
  set("--ring", `${hue} 38% 42%`);
  set("--primary", `${hue} 38% 38%`);
  set("--accent", `${hue} 45% 92%`);
  set("--accent-foreground", `${hue} 50% 24%`);
  set("--sidebar-primary", `${hue} 42% 58%`);
  set("--sidebar-accent-foreground", `${hue} 45% 75%`);
  set("--sidebar-ring", `${hue} 38% 50%`);
  set("--chart-1", `${hue} 38% 42%`);
  // Sidebar BrandMark gradient stops — used only when explicitly opted-in via
  // the `--brand-grad-*` vars below in app-layout.
  set("--brand-grad-from", `${hue} 45% 55%`);
  set("--brand-grad-via", `${(hue + 3) % 360} 40% 45%`);
  set("--brand-grad-to", `${(hue + 8) % 360} 35% 30%`);
}

/**
 * Hook that wires the persisted system settings into the live document:
 *  - swaps the accent palette via CSS custom properties
 *  - keeps `document.title` in sync with the configured app name
 *
 * Mount it once near the root of the React tree.
 */
export function useApplySystemSettings() {
  const { data } = useGetSystemSettings();

  useEffect(() => {
    applyAccentHue(data?.accentHue ?? DEFAULT_HUE);
  }, [data?.accentHue]);

  useEffect(() => {
    if (data?.appName) document.title = data.appName;
  }, [data?.appName]);
}

/**
 * Read-only accessor used by sidebar / login / dashboard so the brand name
 * and logo follow the System settings without prop-drilling.
 */
export function useSystemSettings() {
  const { data, isLoading } = useGetSystemSettings();
  return {
    appName: data?.appName ?? "LEO OS",
    logoImage: data?.logoImage ?? null,
    accentHue: data?.accentHue ?? DEFAULT_HUE,
    companyName: data?.companyName ?? null,
    companyAddress: data?.companyAddress ?? null,
    companyPhone: data?.companyPhone ?? null,
    companyEmail: data?.companyEmail ?? null,
    companyWebsite: data?.companyWebsite ?? null,
    companyRegistrationNumber: data?.companyRegistrationNumber ?? null,
    hasCustomPassword: data?.hasCustomPassword ?? false,
    isLoading,
  };
}
