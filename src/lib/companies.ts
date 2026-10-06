export interface CompanyBrand {
  name: string;
  logo: string;
  badgeBg: string;
  badgeText: string;
  borderHover: string;
  accent: string;
  description: string;
}

export const KNOWN_COMPANIES: Record<string, CompanyBrand> = {
  "J.P": {
    name: "J.P",
    logo: "/companies/jp.svg",
    badgeBg: "bg-sky-500/10",
    badgeText: "text-sky-700",
    borderHover: "hover:border-sky-500",
    accent: "#0596ff",
    description: "Premium Spices, Teas & Staple Grocery",
  },
  "Amir Food": {
    name: "Amir Food",
    logo: "/companies/amir-food.svg",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-700",
    borderHover: "hover:border-amber-500",
    accent: "#d97706",
    description: "Flour, Grains & Cooking Staples",
  },
  "JP Amir Food": {
    name: "JP Amir Food",
    logo: "/companies/jp-amir-food.svg",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-700",
    borderHover: "hover:border-amber-500",
    accent: "#d97706",
    description: "Premium Spices, Teas & Staple Grocery",
  },
  "Mux Food": {
    name: "Mux Food",
    logo: "/companies/mux-food.svg",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-700",
    borderHover: "hover:border-emerald-500",
    accent: "#059669",
    description: "Personal Care, Soaps & Packaged Foods",
  },
  "Master Food": {
    name: "Master Food",
    logo: "/companies/master-food.svg",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-700",
    borderHover: "hover:border-blue-500",
    accent: "#2563eb",
    description: "Home Care, Detergents & Essentials",
  },
  "Jahanzaib Food": {
    name: "Jahanzaib Food",
    logo: "/companies/jahanzaib-food.svg",
    badgeBg: "bg-sky-500/10",
    badgeText: "text-sky-700",
    borderHover: "hover:border-sky-500",
    accent: "#0284c7",
    description: "Dairy, Milk & Fresh Nutrition",
  },
  "Bilal Food": {
    name: "Bilal Food",
    logo: "/companies/bilal-food.png",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-700",
    borderHover: "hover:border-purple-500",
    accent: "#7c3aed",
    description: "Confectionery, Candies, Chews & Bubbles",
  },
  "Bilal Foods": {
    name: "Bilal Food",
    logo: "/companies/bilal-food.png",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-700",
    borderHover: "hover:border-purple-500",
    accent: "#7c3aed",
    description: "Confectionery, Candies, Chews & Bubbles",
  },
  "Other": {
    name: "Other",
    logo: "/companies/other.svg",
    badgeBg: "bg-slate-500/10",
    badgeText: "text-slate-700",
    borderHover: "hover:border-slate-500",
    accent: "#64748b",
    description: "Beverages, General & Unassigned Products",
  },
};

export const CORE_COMPANIES = [
  "J.P",
  "Amir Food",
  "Mux Food",
  "Master Food",
  "Jahanzaib Food",
  "Bilal Food",
];

export const PRESET_COMPANIES = [
  "J.P",
  "Amir Food",
  "JP Amir Food",
  "Mux Food",
  "Master Food",
  "Jahanzaib Food",
  "Bilal Food",
  "Other",
];

export function getCompanyBrand(
  companyName?: string | null,
  customLogo?: string | null,
): CompanyBrand {
  const norm = (companyName || "Other").trim();
  if (KNOWN_COMPANIES[norm]) {
    const brand = { ...KNOWN_COMPANIES[norm] };
    if (customLogo) {
      brand.logo = customLogo;
    }
    return brand;
  }
  // Fallback for custom company
  return {
    name: norm || "Other",
    logo: customLogo || "/companies/other.svg",
    badgeBg: "bg-[#25897c]/10",
    badgeText: "text-[#25897c]",
    borderHover: "hover:border-[#25897c]",
    accent: "#25897c",
    description: "Distributor FMCG Partner",
  };
}
