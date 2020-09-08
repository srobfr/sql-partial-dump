import MysqlConnector from "./MysqlConnector";
import {Entity} from "../types";

const debug = require('debug')('sql-partial-dump:MysqlDumper');

/**
 * Finds the relations in a Mysql database (from foreign keys).
 */
export default class MysqlDumper {

    constructor(private readonly mysqlConnector: MysqlConnector) {

    }

    /**
     * Generates an insert statment for the given entity
     */
    public generateInsertStatment(entity: Entity): string {
        const columns = Object.keys(entity.data);
        return `INSERT INTO \`${entity.table}\` (${columns.join(', ')}) VALUE (${columns.map(c => this.mysqlConnector.escapeValue(entity.data[c])).join(', ')})`;
    }
}
