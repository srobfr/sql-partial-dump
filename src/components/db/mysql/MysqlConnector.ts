import mysql from 'mysql2';
import {DbConnectionConfiguration, Entity} from "../types";

const debug = require('debug')('sql-partial-dump:MysqlConnector');

/**
 * Connector for the Mysql database
 */
export default class MysqlConnector {
    public pool;
    public promisePool;

    /**
     * Opens a connection to the DB server
     * @param configuration
     */
    public async open(configuration: DbConnectionConfiguration) {
        debug(`Connecting to Mysql server ${configuration.host}`);
        const {user, password, host, schema: database} = configuration;
        this.pool = mysql.createPool({
            user, password, host, database,
            connectionLimit: 10,
            waitForConnections: true,
        });
        this.promisePool = this.pool.promise();
    }

    /**
     * Closes the connection
     */
    public close() {
        this.pool.end();
        debug(`Closed connections pool to Mysql server`);
    }

    public async fetchEntities(sql: string, onEntity: (Entity) => void): Promise<void> {
        debug(`Querying :`, sql);
        const query = this.pool.query({
            sql: sql,
            nestTables: true,
            typeCast: (field, next) => {
                // Prevents JSON parsing (default mysql lib behaviour)
                if (field.type === 'JSON') return field.buffer()?.toString('utf8') || null;
                if (field.type === 'DATETIME') return field.buffer()?.toString('utf8') || null;
                return next();
            },
        });

        const onEntityPromises = [];

        await new Promise((resolve, reject) => {
            const entityGeneratorByAliasName = {};
            query
                .on('error', reject)
                .on('end', resolve)
                .on('fields', fields => {
                    // Prepare the columns triage
                    for (const f of fields) {
                        // debug(`${f.table}.${f.name} is ${f.orgTable}.${f.orgName}`);
                        if (entityGeneratorByAliasName[f.table]) continue;
                        entityGeneratorByAliasName[f.table] = row => ({
                            table: f.orgTable,
                            data: row,
                        });
                    }
                })
                .on('result', row => {
                    for (const alias in row) {
                        const entity = entityGeneratorByAliasName[alias](row[alias]);

                        debug(`free/all: ${this.pool._freeConnections.length}/${this.pool._allConnections.length}`);
                        const p = onEntity(entity);
                        onEntityPromises.push(p);
                    }
                })
            ;
        });

        // Wait for all handler to finish
        await Promise.all(onEntityPromises);
    }

    public escapeValue(value: any): string {
        if (value && value.x !== undefined && value.y !== undefined) {
            // Point mysql
            return `ST_GeomFromText('POINT(${value.x} ${value.y})')`;
        }

        return mysql.escape(value);
    }
}
