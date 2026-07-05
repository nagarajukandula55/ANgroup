import Permission, { PermissionType, PermissionStatus } from "@/models/Permission";
import type { IModuleDefinition } from "@/core/module-registry/ModuleDefinition.model";
import { STANDARD_ACTIONS, buildPermissionCode, resolveActionsForModule } from "./actions";

/**
 * Keeps the existing Permission collection in sync with the module
 * registry. This is the piece that actually delivers "map access to every
 * module and option so giving access becomes easy": instead of a developer
 * hand-writing a Permission document for every module/action combination
 * (which is how the original repo ended up with an inconsistent, partial
 * set of permission codes), every module — built-in or admin-created —
 * automatically gets one Permission per applicable standard action the
 * moment it's created, and this function is re-run whenever a module's
 * applicableActions change.
 *
 * Reuses the EXISTING Permission model from the original repo rather than
 * inventing a new one — that model already has exactly the right shape
 * (code, module, group, type SYSTEM/CUSTOM, isActive). This function is
 * purely the missing "keep it populated automatically" piece.
 */
export async function syncPermissionsForModule(
  moduleDef: Pick<IModuleDefinition, "key" | "label" | "isSystem" | "applicableActions">
): Promise<void> {
  const actions = resolveActionsForModule(moduleDef.applicableActions);

  for (const action of actions) {
    const code = buildPermissionCode(moduleDef.key, action.key);

    await Permission.updateOne(
      { code },
      {
        $setOnInsert: {
          code,
          type: moduleDef.isSystem ? PermissionType.SYSTEM : PermissionType.CUSTOM,
          status: PermissionStatus.ACTIVE,
          isActive: true,
          isProtected: moduleDef.isSystem, // system-module permissions can't be deleted from the UI
        },
        $set: {
          name: `${action.label} ${moduleDef.label}`,
          description: `${action.description} in ${moduleDef.label}.`,
          module: moduleDef.key,
          group: moduleDef.label,
        },
      },
      { upsert: true }
    );
  }

  // Deactivate (not delete — preserve audit history / existing role grants)
  // any previously-generated permissions for actions that no longer apply
  // to this module, e.g. an admin removed "delete" from applicableActions.
  const currentCodes = actions.map((a) => buildPermissionCode(moduleDef.key, a.key));
  await Permission.updateMany(
    {
      module: moduleDef.key,
      code: { $nin: currentCodes },
      type: moduleDef.isSystem ? PermissionType.SYSTEM : PermissionType.CUSTOM,
    },
    { $set: { isActive: false, status: PermissionStatus.INACTIVE } }
  );
}

/**
 * Convenience: the full permission code list for a module, without writing
 * anything — used by the access-matrix UI to know what checkboxes to render
 * for a module even before/without touching the database.
 */
export function permissionCodesForModule(
  moduleKey: string,
  applicableActions?: string[]
): { code: string; actionKey: string; label: string }[] {
  return resolveActionsForModule(applicableActions).map((action) => ({
    code: buildPermissionCode(moduleKey, action.key),
    actionKey: action.key,
    label: action.label,
  }));
}

export { STANDARD_ACTIONS };
