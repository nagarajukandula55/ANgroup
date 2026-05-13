export function filterModules({
  modules,
  accessKeys,
}: {
  modules: any[];
  accessKeys: string[];
}) {
  return modules
    .filter((m) => m.enabled)
    .filter((m) => {
      if (!m.permissions || m.permissions.length === 0)
        return true;

      return m.permissions.some((p: string) =>
        accessKeys.includes(p)
      );
    })
    .map((m) => ({
      key: m.key,
      label: m.label,
      route: m.route,
      icon: m.icon,
    }));
}
