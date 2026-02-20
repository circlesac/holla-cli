export type OutputFormat = "table" | "json" | "plain";

export interface HollaConfig {
  slack?: {
    outputFormat?: OutputFormat;
    attribution?: {
      reaction?: string | false;
      suffix?: string | false;
    };
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
