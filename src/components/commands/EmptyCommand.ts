import Debug from "debug";
import MysqlConnector from "../db/mysql/MysqlConnector";
import {DbConnectionConfiguration} from "../db/types";

const debug = Debug('sql-partial-dump:EmptyCommand');

/**
 * empty command : erases all tables content
 */
export default class EmptyCommand {
    constructor(private readonly mysqlConnector: MysqlConnector) {
    }

    private dbConnectionOptions = {
        user: {alias: 'u', description: `User login for the database connection`, required: true},
        password: {alias: 'p', description: `Password for the database connection`, required: true},
        host: {alias: 'h', description: `Serveur host for the database connection`, default: 'localhost'},
        port: {alias: 'P', description: `Port for the database connection`, default: 3306},
        schema: {alias: 's', description: `Database schema for the connection`, required: true},
        driver: {alias: 'd', description: `Database driver to use`, default: 'mysql', choices: ['mysql', 'sqlite']},
        delete: {description: `Use DELETE instead of TRUNCATE`},
    };

    public setup(yargs) {
        yargs.command(
            'empty',
            `Empty all tables in a database.`,
            {
                ...this.dbConnectionOptions,
            },
            argv => this.execute(argv));
    }

    private async execute(argv) {
        // Open connection to DB
        const {user, password, host, port, schema} = argv;

        const connectionConfig: DbConnectionConfiguration = {user, password, host, port, schema};
        await this.mysqlConnector.open(connectionConfig);

        const {promisePool} = this.mysqlConnector;
        const [rows] = await promisePool.execute(`SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ?
            AND TABLE_TYPE = 'BASE TABLE';
            `, [schema]);


        process.stdout.write(`SET FOREIGN_KEY_CHECKS=0;\n`);
        for (const {TABLE_NAME: t} of rows) {
            if (argv.delete) process.stdout.write(`DELETE FROM \`${t}\`;\n`);
            else process.stdout.write(`TRUNCATE TABLE \`${t}\`;\n`);
        }
        process.stdout.write(`SET FOREIGN_KEY_CHECKS=1;\n`);

        // Close connection
        this.mysqlConnector.close();
    }
}
