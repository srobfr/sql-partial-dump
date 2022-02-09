/**
 * SQL partial dump configuration file example
 */
export default {
    /**
     * Relations where the related entity must be dumped *before* the current entity to satisfy the foreign key constraint.
     */
    preRequisites: [
        `SELECT * FROM Owner WHERE id IN ({{Pet.ownerId}})`,
    ],

    /**
     * Relations where the related entity must be dumped *after* the current entity to satisfy the foreign key constraint.
     */
    postRequisites: [
        `SELECT * FROM Pet WHERE ownerId IN ({{Owner.id}})`,
    ],

    /**
     * Initial queries
     */
    queries: [
        `SELECT * FROM Pet`,
    ],

    /**
     * Patches applied in-ram on fetched entities before dumping them
     */
    patches: [
        {table: 'Person', patch: row => ({...row, name: '[redacted]]'})}, // Patches Person.name
    ],


    /**
     * Some raw SQL queries to append at the end to the output
     */
    postDumpQueries: [
        `INSERT INTO Pet (name) VALUE ('Dogbert')`,
    ],
};
