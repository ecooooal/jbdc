/**
 * Materials — the owner-managed list a Design's Material uses draw from. It
 * owns name trimming, duplicate refusal, restoring a removed name, and the name
 * read that still resolves a soft-deleted Material. A design reaches its
 * Materials through Material uses, which belong to the Design aggregate.
 */
export {
  createMaterial,
  InvalidMaterialNameError,
  listMaterials,
  MATERIAL_NAME_MAX_LENGTH,
  materialsRead,
  readMaterialNames,
  readMaterialNamesFrom,
} from './lib/records';
export type { CreateMaterialInput, Material, MaterialsRows } from './lib/records';
