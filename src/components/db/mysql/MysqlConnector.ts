import Debug from "debug";
import mysql, { FieldPacket } from 'mysql2';
import { Pool } from 'mysql2/typings/mysql/lib/Pool';
import { DbConnectionConfiguration, Entity } from "../types";

const debug = Debug('sql-partial-dump:MysqlConnector');

function isEntityEmpty(entity: Entity) {
    return !Object.values(entity.data).some(v => v !== null)
}

async function fetchEntities(sql: string, pool: Pool): Promise<NodeJS.ReadableStream> {
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

    query.on('fields', (fields: Array<FieldPacket>) => {
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
    });

    let controller: ReadableStreamDefaultController;
    const stream: NodeJS.ReadableStream = new ReadableStream<Entity>({
        start(_controller) {
            controller = _controller;
        }
    }) as unknown as NodeJS.ReadableStream; // See https://github.com/microsoft/TypeScript/issues/39051#issuecomment-1622597485

    query.on("result", (row) => {
        for (const alias in row) {
            const entity = entityGeneratorByAliasName[alias](row[alias]);
            if (!isEntityEmpty(entity)) controller.enqueue(entity);
        }
    });

    query.once("end", () => controller.close());
    query.once("error", (err) => controller.error(err));

    return stream;
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
        const { user, password, host, port, schema: database } = configuration;
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

    public async fetchEntities(sql: string): Promise<NodeJS.ReadableStream> {
        return fetchEntities(sql, this.pool);
    }

    public escapeValue(value: any): string {
        if (value && value.x !== undefined && value.y !== undefined) {
            // Point mysql
            return `ST_GeomFromText('POINT(${value.x} ${value.y})')`;
        }
        // Add more types here if needed

        return mysql.escape(value);
    }
}
