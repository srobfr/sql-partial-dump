import Debug from "debug";
import * as path from "path";
import {DbConnectionConfiguration, Entity} from "../db/types";
import MysqlConnector from "../db/mysql/MysqlConnector";
import MysqlRelationsFinder from "../db/mysql/MysqlRelationsFinder";
import DataDumper from "../db/DataDumper";
import MysqlDumper from "../db/mysql/MysqlDumper";

const debug = Debug('sql-partial-dump:DumpCommand');

/**
 * Main dump command
 */
export default class DumpCommand {
    constructor(private readonly mysqlConnector: MysqlConnector,
                private readonly mysqlRelationsFinder: MysqlRelationsFinder,
                private readonly mysqlDumper: MysqlDumper,
                private readonly dataDumper: DataDumper) {
    }

    private dbConnectionOptions = {
        user: {alias: 'u', description: `User login for the database connection`, required: true},
        password: {alias: 'p', description: `Password for the database connection`, required: true},
        host: {alias: 'h', description: `Serveur host for the database connection`, default: 'localhost'},
        schema: {alias: 's', description: `Database schema for the connection`, required: true},
        driver: {alias: 'd', description: `Database driver to use`, default: 'mysql', choices: ['mysql', 'sqlite']},
    };

    public setup(yargs) {
        yargs.command(
            'dump <configFile>',
            `Dumps data from a database.`,
            {
                configFile: {description: `Path for the configuration file`},
                ...this.dbConnectionOptions,
            },
            argv => this.execute(argv));
    }

    private async execute(argv) {
        // Open readonly connection to DB
        const {user, password, host, schema} = argv;
        const connectionConfig: DbConnectionConfiguration = {user, password, host, schema};
        await this.mysqlConnector.open(connectionConfig);

        const relations = await this.mysqlRelationsFinder.findRelations(schema);

        // Read configuration
        const configuration = require(path.resolve(argv.configFile));
        if (configuration.relations) relations.push(...configuration.relations);
        debug(relations);

        // Runs the data dump
        await this.dataDumper.dump(configuration.queries, relations, (entity: Entity) => {
            console.log(this.mysqlDumper.generateInsertStatment(entity));
        });

        // Close connection
        this.mysqlConnector.close();
    }

    private getConnection(config) {

    }
}
