export type MobilePackage = {
  package: string;
};

/** Stub until mobile packages API + React Query are ported. */
export function useMobilePackages(
  _udid: string | null | undefined,
  _query?: string
): {
  data: MobilePackage[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  return { data: [], isLoading: false, isError: false, error: null };
}
