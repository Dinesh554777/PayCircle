import {
  Utensils,
  Car,
  Clapperboard,
  ShoppingBag,
  Zap,
  HeartPulse,
  GraduationCap,
  Plane,
  Home,
  Tag,
} from "lucide-react";

export const CATEGORY_CONFIG = {
  Food: { icon: Utensils, color: "#f97316", soft: "rgba(249, 115, 22, 0.14)" },
  Transport: { icon: Car, color: "#0ea5e9", soft: "rgba(14, 165, 233, 0.14)" },
  Entertainment: { icon: Clapperboard, color: "#8b5cf6", soft: "rgba(139, 92, 246, 0.14)" },
  Shopping: { icon: ShoppingBag, color: "#ec4899", soft: "rgba(236, 72, 153, 0.14)" },
  Utilities: { icon: Zap, color: "#f59e0b", soft: "rgba(245, 158, 11, 0.14)" },
  Healthcare: { icon: HeartPulse, color: "#ef4444", soft: "rgba(239, 68, 68, 0.14)" },
  Education: { icon: GraduationCap, color: "#14b8a6", soft: "rgba(20, 184, 166, 0.14)" },
  Travel: { icon: Plane, color: "#6366f1", soft: "rgba(99, 102, 241, 0.14)" },
  Rent: { icon: Home, color: "#64748b", soft: "rgba(100, 116, 139, 0.16)" },
  Other: { icon: Tag, color: "#94a3b8", soft: "rgba(148, 163, 184, 0.16)" },
};

export const CATEGORY_COLORS = Object.values(CATEGORY_CONFIG).map((c) => c.color);

export function getCategoryConfig(category) {
  if (!category) return CATEGORY_CONFIG.Other;
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Other;
}
