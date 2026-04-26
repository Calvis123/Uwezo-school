export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  HEADTEACHER: "Headteacher",
  DOS: "Director of Studies",
  TEACHER: "Teacher",
  SECRETARY: "Secretary",
  BURSAR: "Bursar",
  PARENT: "Parent",
};

export const SUPER_ADMIN_ROLES = ["SUPER_ADMIN"] as const;
export const USER_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"] as const;
export const ADMIN_ROLES = USER_ADMIN_ROLES;
export const SYSTEM_SETTINGS_ROLES = ["SUPER_ADMIN", "ADMIN", "HEADTEACHER"] as const;
export const ACADEMIC_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "HEADTEACHER", "DOS"] as const;
export const FINANCE_ROLES = ["SUPER_ADMIN", "ADMIN", "HEADTEACHER", "BURSAR"] as const;
export const OFFICE_ROLES = ["SUPER_ADMIN", "ADMIN", "HEADTEACHER", "SECRETARY"] as const;
export const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "HEADTEACHER",
  "DOS",
  "TEACHER",
  "SECRETARY",
  "BURSAR",
] as const;
export const PARENT_ROLES = ["PARENT"] as const;
export const ALL_ROLES = [...STAFF_ROLES, ...PARENT_ROLES] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type ParentRole = (typeof PARENT_ROLES)[number];
export type AnyRole = (typeof ALL_ROLES)[number];
