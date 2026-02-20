export const commonArgs = {
  workspace: {
    type: "string" as const,
    description: "Workspace name",
    alias: "w",
  },
  json: { type: "boolean" as const, description: "Output as JSON" },
  plain: { type: "boolean" as const, description: "Output as plain text" },
};

export const cursorPaginationArgs = {
  limit: {
    type: "string" as const,
    description: "Number of items to return (default 20)",
  },
  all: {
    type: "boolean" as const,
    description: "Auto-paginate to fetch all results",
  },
  cursor: {
    type: "string" as const,
    description: "Pagination cursor",
  },
};

export const attributionArgs = {
  agent: {
    type: "string" as const,
    description: "Override agent name for attribution",
  },
  attribution: {
    type: "boolean" as const,
    description: "Enable attribution (use --no-attribution to disable)",
  },
  reaction: {
    type: "boolean" as const,
    description: "Enable attribution reaction (use --no-reaction to disable)",
  },
  suffix: {
    type: "boolean" as const,
    description: "Enable attribution suffix (use --no-suffix to disable)",
  },
};

export const pagePaginationArgs = {
  limit: {
    type: "string" as const,
    description: "Number of results to return (default 20)",
  },
  page: {
    type: "string" as const,
    description: "Page number (default 1)",
  },
  sort: {
    type: "string" as const,
    description: "Sort by: score or timestamp (default score)",
  },
  "sort-dir": {
    type: "string" as const,
    description: "Sort direction: asc or desc (default desc)",
  },
};
