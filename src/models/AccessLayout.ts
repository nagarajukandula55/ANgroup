import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Singleton document (one row, upserted) holding admin-authored overrides
 * on top of the built-in ACCESS_HIERARCHY (moduleHierarchy.ts). Lets an
 * admin create/rename/delete category and subcategory CONTAINERS and
 * re-parent real, already-enforced modules under them from the Admin >
 * Access UI -- without ever inventing a new "module" that isn't backed by
 * a real requirePermission() check (that anti-pattern is exactly what
 * moduleHierarchy.ts's own comment warns against; see that file).
 */
export interface IAccessCategoryNode {
  key: string;
  label: string;
  // null = top-level category; a category's own key = subcategory under it.
  // Categories/subcategories are never nested more than 2 deep.
  parentKey: string | null;
  order: number;
}

export interface IAccessLayout extends Document {
  categories: IAccessCategoryNode[];
  // moduleKey -> category/subcategory key it's been moved under. Only
  // entries that differ from ACCESS_HIERARCHY's built-in placement need to
  // exist here.
  moduleParent: Map<string, string>;
  updatedAt: Date;
}

const AccessCategoryNodeSchema = new Schema<IAccessCategoryNode>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    parentKey: { type: String, default: null },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const AccessLayoutSchema = new Schema<IAccessLayout>(
  {
    categories: { type: [AccessCategoryNodeSchema], default: [] },
    moduleParent: { type: Map, of: String, default: {} },
  },
  { timestamps: true, versionKey: false }
);

const AccessLayout: Model<IAccessLayout> =
  mongoose.models.AccessLayout || mongoose.model<IAccessLayout>('AccessLayout', AccessLayoutSchema);

export default AccessLayout;
