/**
 * This is a sample configuration script for sql-partial-dump.
 */
module.exports = {
  // This is the connexion credentials of the source database.
  source: {
    type: 'mysql', // "mysql" or "mssql"
    host: '35.195.230.109', // The server ip or hostname
    db: 'tara', // The db name
    user: 'tara', // The login
    password: 'foobar', // The password
    // instance: 'foo', // For mssql only
  },

  relations: [
    // If we are dumping a Pet object, then dump also its owner
    `SELECT * FROM Person WHERE id = {{Pet.ownerId}}`,
  ],

  queries: [
    // We only need 2 pets (and their owners) in our dump.
    `SELECT * FROM Pet LIMIT 2`,
  ],

  patches: [
    // Replaces the dumped persons' emails by a fake one.
    {table: 'Person', patch: person => {person.email = `person${person.id}@example.com`}},
  ]
};