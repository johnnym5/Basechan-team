import * as z from "zod";

export const staffProfileSchema = z.object({
  // Basic Info
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits.").nullable().optional(),
  dateOfBirth: z.string().optional(), // ISO string
  avatarUrl: z.string().url().nullable().optional(),
  address: z.string().optional(),

  // Employment Details
  employeeId: z.string().min(1, "Employee ID is required."),
  jobTitle: z.string().min(1, "Job title is required."),
  departmentName: z.string().min(1, "Department is required."),
  role: z.enum(["ORG_ADMIN", "MANAGING_DIRECTOR", "HR_MANAGER", "FINANCE_MANAGER", "STAFF"]),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
  managerId: z.string().optional(), // Reference to another user ID
  joinDate: z.string().optional(), // ISO string
  status: z.enum(["ONLINE", "OFFLINE", "ON_LEAVE", "ACTIVE", "SUSPENDED", "TERMINATED"]),

  // Emergency Contact
  emergencyContact: z.object({
    name: z.string().min(2, "Contact name is required."),
    relationship: z.string().min(1, "Relationship is required."),
    phone: z.string().min(10, "Valid phone number is required."),
  }).optional(),

  // System Metadata
  orgId: z.string(),
  id: z.string(),
});

export type StaffProfileFormValues = z.infer<typeof staffProfileSchema>;
