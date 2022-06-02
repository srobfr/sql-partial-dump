import MysqlConnector from "./MysqlConnector";

const debug = require('debug')('sql-partial-dump:MysqlRelationsFinder');

/**
 * Finds the relations in a Mysql database (from foreign keys).
 */
export default class MysqlRelationsFinder {
    private readonly foundPreRequisitesBySchemaTable = new Map<string, Array<string>>();
    private readonly foundPostRequisitesBySchemaTable = new Map<string, Array<string>>();

    constructor(private readonly mysqlConnector: MysqlConnector) {
    }

    public async findPreRequisites(schema: string, table: string, configPreRequisites: Array<string>): Promise<Array<string>> {
        {
            let r: string[];
            if (r = this.foundPreRequisitesBySchemaTable.get(`${schema}.${table}`)) return r;
        }

        // Needed relations extracted from the DB's foreign keys
        const pFkRelations = this.findForeignKeyRelations(schema, table);

        // Needed relations from the config
        const relations = configPreRequisites.filter(
            (relation: string) => !!relation.match(new RegExp(`\{\{(?:(?<schema>${schema})\\.)?(?<table>${table})\\.(?<column>.+?)\}\}`))
        );

        const r = [
            ...await pFkRelations,
            ...relations,
        ];

        this.foundPreRequisitesBySchemaTable.set(`${schema}.${table}`, r);

        return r;
    }

    public async findPostRequisites(schema: string, table: string, configPostRequisites: Array<string>): Promise<Array<string>> {
        {
            let r: string[];
            if (r = this.foundPostRequisitesBySchemaTable.get(`${schema}.${table}`)) return r;
        }

        // Needed relations from the config
        const relations = configPostRequisites.filter(
            (relation: string) => !!relation.match(new RegExp(`\{\{(?:(?<schema>${schema})\\.)?(?<table>${table})\\.(?<column>.+?)\}\}`))
        );

        this.foundPostRequisitesBySchemaTable.set(`${schema}.${table}`, relations);

        return relations;
    }

    /**
     * Finds relations based on foreign keys
     * @param schema
     */
    public async findForeignKeyRelations(schema: string, table: string): Promise<Array<string>> {
        const {promisePool} = this.mysqlConnector;
        const [rows] = await promisePool.execute(`SELECT COLUMN_NAME,
        REFERENCED_TABLE_SCHEMA,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
 WHERE TABLE_SCHEMA = ?
   AND TABLE_NAME = ?
   AND REFERENCED_COLUMN_NAME IS NOT NULL`, [schema, table]);

        return rows.map(
            ({COLUMN_NAME, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME}) =>
                `SELECT * FROM \`${REFERENCED_TABLE_SCHEMA}\`.\`${REFERENCED_TABLE_NAME}\` WHERE \`${REFERENCED_COLUMN_NAME}\` IN ({{${schema}.${table}.${COLUMN_NAME}}})`
        );
    }
}
