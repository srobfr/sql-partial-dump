import MysqlConnector from "./MysqlConnector";

const debug = require('debug')('sql-partial-dump:MysqlRelationsFinder');

/**
 * Finds the relations in a Mysql database (from foreign keys).
 */
export default class MysqlRelationsFinder {
    constructor(private readonly mysqlConnector: MysqlConnector) {
    }

    /**
     * Finds relations based on foreign keys
     * @param schema
     */
    public async findRelations(schema: string): Promise<Array<string>> {
        debug(`Finding relations for schema ${schema}`);
        const {promisePool} = this.mysqlConnector;
        const [rows] = await promisePool.execute(`SELECT TABLE_NAME,
       COLUMN_NAME,
       CONSTRAINT_NAME,
       REFERENCED_TABLE_NAME,
       REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = ?`, [schema]);

        return rows.map(
            ({TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME}) =>
                `SELECT * FROM \`${REFERENCED_TABLE_NAME}\` WHERE \`${REFERENCED_COLUMN_NAME}\` IN ({{*${TABLE_NAME}.${COLUMN_NAME}}})`
        );
    }
}
