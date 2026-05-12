export type UserRole = "Administrador" | "Analista";

export interface RoleConfig {
  label: string;
  badgeClass: string;
  allowedPaths: string[];
  canManageSettings: boolean;
  canManageProducts: boolean;
  canManageMarketing: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  Administrador: {
    label: "Administrador",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    allowedPaths: ["/", "/products", "/orders", "/customers", "/analytics", "/marketing", "/settings"],
    canManageSettings: true,
    canManageProducts: true,
    canManageMarketing: true,
    canExportData: true,
    canManageUsers: true,
  },
  Analista: {
    label: "Analista",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    allowedPaths: ["/", "/analytics", "/customers"],
    canManageSettings: false,
    canManageProducts: false,
    canManageMarketing: false,
    canExportData: false,
    canManageUsers: false,
  },
};

export function getRoleConfig(role?: string): RoleConfig {
  if (role === "Administrador") return ROLE_CONFIG.Administrador;
  return ROLE_CONFIG.Analista;
}

export function canAccess(path: string, role?: string): boolean {
  const config = getRoleConfig(role);
  return config.allowedPaths.includes(path);
}
