module.exports = {
    relations: [
        // Specify here the relations between entities
        `SELECT * FROM Person WHERE id = {{Pat.id}}`, // Fetch the pets owners (one by one, /!\ SLOW /!\)
        `SELECT * FROM Person WHERE id IN ({{*Pat.id}})`, // Fetch the pets owners (by batch)
    ],

    queries: [
        // Initial queries
        `SELECT * FROM Pet`,
    ],

    patches: [
        {   // Patches configurations : useful to edit some confidential infos in the final dump
            table: 'Person',
            patch: row => Object.assign(row, {name: '[redacted]]'}),
        },
    ],

    postDumpQueries: [
        // Some queries to append to the output.
        `INSERT INTO Pet (name) VALUE ('Dogbert')`
    ],
};
