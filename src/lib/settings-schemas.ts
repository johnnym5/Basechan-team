import { z } from "zod";

export const GeneralSettingsSchema = z.object({
  legalName: z.string().min(2, "Company name is too short"),
  taxId: z.string().optional(),
  timezone: z.string().default("UTC"),
  fiscalYearStart: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  currency: z.string().default("USD"),
  dateFormat: z.string().default("MM/DD/YYYY"),
});

export const SecuritySettingsSchema = z.object({
  enforce2FA: z.boolean().default(false),
  sessionTimeout: z.number().min(5).max(1440).default(60),
  passwordExpiryDays: z.number().min(0).max(365).default(90),
  whitelistedIPs: z.array(z.string()).default([]),
});

export const NotificationSettingsSchema = z.object({
  enableEmailAlerts: z.boolean().default(true),
  enableInAppAlerts: z.boolean().default(true),
  slackWebhookUrl: z.string().url().optional().or(z.literal("")),
  teamsWebhookUrl: z.string().url().optional().or(z.literal("")),
});

export const WorkflowSettingsSchema = z.object({
  approvalThresholds: z.record(z.string(), z.number()).default({
    md_approval: 50000,
    finance_approval: 10000,
  }),
  delegateId: z.string().optional(),
});

export const DataSettingsSchema = z.object({
  auditRetentionDays: z.number().min(30).default(365),
  automatedBackup: z.boolean().default(true),
});

export type GeneralSettings = z.infer<typeof GeneralSettingsSchema>;
export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>;
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type WorkflowSettings = z.infer<typeof WorkflowSettingsSchema>;
export type DataSettings = z.infer<typeof DataSettingsSchema>;

export interface OrganizationSettings {
  general: GeneralSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
  workflows: WorkflowSettings;
  data: DataSettings;
  updatedAt?: any;
}
