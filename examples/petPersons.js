/**
 * Relations where the related entity must be dumped *before* the current entity to satisfy the foreign key constraint.
 */
export const preRequisites = [
  `SELECT * FROM Owner WHERE id IN ({{Pet.ownerId}})`,
];

/**
 * Relations where the related entity must be dumped *after* the current entity to satisfy the foreign key constraint.
 */
export const postRequisites = [
  `SELECT * FROM Pet WHERE ownerId IN ({{Owner.id}})`,
];

/**
 * Initial queries
 */
export const queries = [
  `SELECT * FROM Pet`,
];

/**
 * Patch applied in-ram on fetched entities before dumping them
 */
export const patches = [
  { table: 'Person', patch: row => ({ ...row, name: '[redacted]]' }) }, // Patches Person.name
];

/**
 * Some raw SQL queries to append at the end to the output
 */
export const postDumpQueries = [
  `INSERT INTO Pet (name) VALUE ('Dogbert')`,
];
