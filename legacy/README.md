# sql-partial-dump

This project allows to dump partial data from a relational database,
while preserving data consistency.

It does so by following the "dependancies" between the entities stored in database 
(either formalized by foreign keys, or explicitly configured in a configuration file).

See `examples/config.js`.

This is a work in progress. Expect things to change.
