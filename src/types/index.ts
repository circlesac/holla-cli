export type OutputFormat = "table" | "json" | "plain";

export interface HollaConfig {
  slack?: {
    outputFormat?: OutputFormat;
    defaultWorkspace?: string;
  };
}

export interface WorkspaceCredentials {
  name: string;
  botToken?: string;
  userToken?: string;
}

export interface ResolvedEntity {
  id: string;
  name: string;
  resolvedAt: number;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
