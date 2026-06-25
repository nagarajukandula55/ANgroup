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
      if (
        !m.access ||
        m.access.length === 0
      ) {
        return true;
      }

      return m.access.some(
        (a: any) =>
          accessKeys.includes(a.key)
      );
    })
    .map((m) => ({
      key: m.key,
      label: m.label,
      route: m.route,
      icon: m.icon,
    }));
}
