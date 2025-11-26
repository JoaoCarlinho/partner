/**
 * Organization settings structure
 */
export interface OrganizationSettings {
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  defaults?: {
    defaultTemplateId?: string;
    sessionTimeoutMinutes?: number;
  };
  features?: {
    enableAIAssist?: boolean;
    enablePublicDefenders?: boolean;
  };
}

/**
 * Default organization settings
 */
export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  branding: {
    primaryColor: '#493087',
    secondaryColor: '#6B4BA3',
  },
  defaults: {
    sessionTimeoutMinutes: 480, // 8 hours
  },
  features: {
    enableAIAssist: true,
    enablePublicDefenders: false,
  },
};

/**
 * Organization entity
 */
export interface Organization {
  id: string;
  name: string;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization update request
 */
export interface UpdateOrganizationRequest {
  name?: string;
  settings?: Partial<OrganizationSettings>;
}
