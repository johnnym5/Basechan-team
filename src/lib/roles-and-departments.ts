import { UserPosition, UserRole } from './types';

export const PREDEFINED_DEPARTMENTS = [
    "Administration & Human Resources (HR)",
    "Finance & Accounting",
    "Operations & Production",
    "Sales & Marketing",
    "Information Technology (IT)",
    "Executive",
] as const;

export const ROLES_BY_DEPARTMENT: Record<(typeof PREDEFINED_DEPARTMENTS)[number], string[]> = {
    "Administration & Human Resources (HR)": [
        "HR Manager / Director",
        "HR Officer / Specialist",
        "Payroll Administrator",
        "Office Manager / Admin Lead",
        "Front Desk Officer / Receptionist",
    ],
    "Finance & Accounting": [
        "Chief Financial Officer (CFO) / Finance Manager",
        "Accountant",
        "Accounts Payable (AP) Clerk",
        "Accounts Receivable (AR) Clerk",
        "Auditor / Compliance Officer",
    ],
    "Operations & Production": [
        "Operations Manager",
        "Project Manager",
        "Quality Assurance (QA) Specialist",
        "Procurement / Supply Chain Officer",
        "Logistics / Dispatch Coordinator",
    ],
    "Sales & Marketing": [
        "Sales Manager",
        "Business Development Representative (BDR)",
        "Marketing Coordinator",
        "Content Creator / Designer",
        "Customer Success / Account Manager",
    ],
    "Information Technology (IT)": [
        "IT Manager / CTO",
        "Systems Administrator",
        "IT Support / Helpdesk Technician",
        "Software Developer",
        "Data Analyst",
    ],
    "Executive": [
        "CEO / Managing Director",
    ],
};

export const GENERIC_ROLES = [
    "Organization Administrator", // Special role
    "Staff", // Generic fallback
] as const;


// Flatten all roles into a single array for type definitions and general use
const allDepartmentRoles = Object.values(ROLES_BY_DEPARTMENT).flat();
export const PREDEFINED_ROLES = [...new Set([...allDepartmentRoles, ...GENERIC_ROLES])] as const;

export const getRoleFromPosition = (position: UserPosition): UserRole => {
    switch (position) {
        case "CEO / Managing Director":
            return "MANAGING_DIRECTOR";
        case "Chief Financial Officer (CFO) / Finance Manager":
            return "FINANCE_MANAGER";
        case "HR Manager / Director":
        case "Office Manager / Admin Lead":
            return "HR_MANAGER";
        case "Organization Administrator":
        case "IT Manager / CTO":
            return "ORG_ADMIN";
        default:
            return "STAFF";
    }
}
