import MysqlConnector from "./MysqlConnector.js";
import {Entity} from "../types";
import Debug from "debug"

const debug = Debug('sql-partial-dump:MysqlDumper');

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
        const schema = entity.schema ? `\`${entity.schema}\`.` : '';
        return `INSERT INTO ${schema}\`${entity.table}\` (${columns.map(c => '`' + c + '`').join(', ')}) VALUE (${columns.map(c => this.mysqlConnector.escapeValue(entity.data[c])).join(', ')})`;
    }
}
