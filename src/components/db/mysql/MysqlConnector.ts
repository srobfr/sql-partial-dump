import mysql from 'mysql2';
import {DbConnectionConfiguration, Entity} from "../types";

const debug = require('debug')('sql-partial-dump:MysqlConnector');

function isEntityEmpty(entity: Entity) {
    return !Object.values(entity.data).some(v => v!==null)
}

async function* fetchEntities(sql: string, pool): AsyncGenerator<Entity, void, unknown> {
    debug(`Querying :`, sql);
    const query = pool.query({
        sql: sql,
        nestTables: true,
        typeCast: (field, next) => {
            // Prevents JSON parsing (default mysql lib behaviour)
            if (field.type === 'JSON') return field.buffer()?.toString('utf8') || null;
            if (field.type === 'DATETIME') return field.buffer()?.toString('utf8') || null;
            return next();
        },
    });

    const entityGeneratorByAliasName = {};
    const stream = query.stream({highWaterMark: 5});

    await new Promise<void>((resolve, reject) => {
        query.on('fields', fields => {
            // Prepare the columns triage
            for (const f of fields) {
                // debug(`${f.table}.${f.name} is ${f.schema}.${f.orgTable}.${f.orgName}`);
                if (entityGeneratorByAliasName[f.table]) continue;
                entityGeneratorByAliasName[f.table] = row => ({
                    schema: f.schema,
                    table: f.orgTable,
                    data: row,
                });
            }

            resolve();
        });
    });

    for await (const row of stream) {
        for (const alias in row) {
            const entity = entityGeneratorByAliasName[alias](row[alias]);
            if (!isEntityEmpty(entity)) yield entity;
        }
    }
}

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
        const {user, password, host, port, schema: database} = configuration;
        this.pool = mysql.createPool({
            user, password, host, port, database,
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

    public async fetchEntities(sql: string): Promise<AsyncGenerator<Entity, void, unknown>> {
        return fetchEntities(sql, this.pool);
    }

    public escapeValue(value: any): string {
        if (value && value.x !== undefined && value.y !== undefined) {
            // Point mysql
            return `ST_GeomFromText('POINT(${value.x} ${value.y})')`;
        }

        return mysql.escape(value);
    }
}
