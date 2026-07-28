export function resolveTemplateString(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    if (value === undefined) {
      throw new Error(`Missing playbook variable: ${key}`);
    }
    return value;
  });
}

export function resolveDeep<T>(value: T, variables: Record<string, string>): T {
  if (typeof value === "string") {
    return resolveTemplateString(value, variables) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveDeep(item, variables)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = resolveDeep(child, variables);
    }
    return out as T;
  }
  return value;
}
