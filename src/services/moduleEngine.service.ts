export function filterModules({
  modules,
  accessKeys,
}: {
  modules: any[];
  accessKeys: string[];
}) {
  return modules
    .filter((module) => module.enabled)
    .filter((module) => {
      const access = module.access || [];

      if (access.length === 0) {
        return true;
      }

      return access.some((item: any) =>
        accessKeys.includes(item.key)
      );
    })
    .sort(
      (a, b) =>
        (a.sortOrder || 0) - (b.sortOrder || 0)
    )
    .map((module) => ({
      key: module.key,
      label: module.label,
      route: module.route,
      icon: module.icon,
      parent: module.parent || null,
      badge: module.badge || "",
      sortOrder: module.sortOrder || 0,
    }));
}
