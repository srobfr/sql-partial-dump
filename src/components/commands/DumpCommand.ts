import Debug from "debug";
import * as path from "path";
import {DbConnectionConfiguration, Entity} from "../db/types";
import MysqlConnector from "../db/mysql/MysqlConnector";
import MysqlRelationsFinder from "../db/mysql/MysqlRelationsFinder";
import MysqlDumper from "../db/mysql/MysqlDumper";

const debug = Debug('sql-partial-dump:DumpCommand');

/**
 * Main dump command
 */
export default class DumpCommand {
    constructor(private readonly mysqlConnector: MysqlConnector,
        private readonly mysqlRelationsFinder: MysqlRelationsFinder,
        private readonly mysqlDumper: MysqlDumper) {
    }

    private dbConnectionOptions = {
        user: {alias: 'u', description: `User login for the database connection`, required: true},
        password: {alias: 'p', description: `Password for the database connection`, required: true},
        host: {alias: 'h', description: `Serveur host for the database connection`, default: 'localhost'},
        schema: {alias: 's', description: `Default db schema (used if not specified in the queries)`, required: true},
        driver: {alias: 'd', description: `Database driver to use`, default: 'mysql', choices: ['mysql', 'sqlite']},
    };

    public setup(yargs) {
        yargs.command(
            'dump <configFile>',
            `Dumps data from a database.`,
            {
                configFile: {description: `Path for the configuration file`},
                verbose: {alias: 'v', description: `Enables progress message on stderr`},
                ...this.dbConnectionOptions,
            },
            argv => this.execute(argv));
    }

    private static generateEntityHash(entity: Entity) {
        if (entity.data.id) return entity.schema + entity.table + entity.data.id;
        // TODO Create hash based on primary key config
        return JSON.stringify(entity); // Fallback to JSON stringifying.
    }

    private async execute(argv) {
        // Open readonly connection to DB
        const {user, password, host, schema} = argv;
        const progressLog = argv.verbose
            ? (text, goToLineStart) => process.stderr.write(text + (goToLineStart ? '\r' : '\n'))
            : () => {};

        const stats = {
            startTime: new Date().getTime(),
            dumpedCount: 0,
            fetchedCount: 0,
            selectQueriesCount: 0,
        };

        function showStats(goToLineStart = true) {
            progressLog(
                [
                    `Dumped : ${stats.dumpedCount}`,
                    `Fetched : ${stats.fetchedCount}`,
                    `RAM : ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                    `Selects : ${stats.selectQueriesCount}`,
                    `Duration : ${((new Date().getTime() - stats.startTime) / 1000).toFixed(2)}s  `,
                ].join(' / '),
                goToLineStart
            );
        }

        const statInterval = setInterval(() => showStats(true), 100);

        const connectionConfig: DbConnectionConfiguration = {user, password, host, schema};
        await this.mysqlConnector.open(connectionConfig);

        const configuration = require(path.resolve(argv.configFile));
        const queries = [...configuration.queries];

        const {mysqlConnector, mysqlRelationsFinder, mysqlDumper} = this;
        const maxBatchSize = 50;
        const alreadyProcessedSql = new Set<string>();
        const alreadyFetchedEntityHash = new Set<string>();

        function relationToSql(relation: string, batch: Array<Entity>): string {
            const {schema, table} = batch[0];
            const re = new RegExp(`\{\{(?:(?<schema>${schema})\\.)?(?<table>${table})\\.(?<column>.+?)\}\}`);
            return relation.replace(re, (...args): string => {
                const {column} = args.pop();
                return Array.from(
                    new Set<string>(
                        batch.map(entity => mysqlConnector.escapeValue(entity.data[column]))
                    )
                ).join(',');
            });
        }

        async function processBatch(batch: Array<Entity>) {
            const {schema, table} = batch[0];

            {   // Find preprequisites relations (=entities that must be dumped before this one)
                const prerequisites = await mysqlRelationsFinder.findPrerequisites(schema, table, configuration.prerequisites || []);
                for (const relation of prerequisites) {
                    const sql = relationToSql(relation, batch);
                    await processSql(sql);
                }
            }

            // Dump
            for (const entity of batch) {
                const patchedEntity = DumpCommand.patch(configuration.patches || [], entity);
                process.stdout.write(mysqlDumper.generateInsertStatment(patchedEntity) + ';\n');
                stats.dumpedCount++;
            }

            {   // Find postrequisites relations (=entities that must be dumped after this one)
                const postrequisites = await mysqlRelationsFinder.findPostrequisites(schema, table, configuration.postrequisites || []);
                for (const relation of postrequisites) {
                    const sql = relationToSql(relation, batch);
                    await processSql(sql);
                }
            }
        }

        async function processSql(sql) {
            if (alreadyProcessedSql.has(sql)) return; // Prevents infinite loops
            alreadyProcessedSql.add(sql);

            // Fetches entities from DB
            stats.selectQueriesCount++;
            const entities = await mysqlConnector.fetchEntities(sql);
            let batch: Array<Entity> = [];
            for await (const entity of entities) {
                const hash = DumpCommand.generateEntityHash(entity);
                if (alreadyFetchedEntityHash.has(hash)) continue;
                alreadyFetchedEntityHash.add(hash);

                stats.fetchedCount++;
                if ((batch.length === 0 || (batch[0].schema === entity.schema && batch[0].table === entity.table))
                    && batch.length < maxBatchSize
                ) {
                    // Just accumulate in the current batch and continue
                    batch.push(entity);
                    continue;
                }

                // Process the current batch
                await processBatch(batch);
                // Then reset it
                batch = [entity];
            }
            if (batch.length > 0) await processBatch(batch);
        }

        for (const sql of queries) await processSql(sql);

        // Close connection
        this.mysqlConnector.close();

        if (configuration.postDumpQueries) process.stdout.write(configuration.postDumpQueries.map(q => q + ';\n').join(''));

        clearInterval(statInterval);

        showStats(false);
    }

    private static patch(patchConfigs: Array<{schema?: string, table: string, patch: Function}>, entity: Entity): Entity {
        const e: Entity = {schema: entity.schema, table: entity.table, data: {...entity.data}}; // Clone
        for (const patch of patchConfigs) {
            if ((!patch.schema || patch.schema === e.schema) && patch.table === e.table) e.data = patch.patch(e.data);
        }
        return e;
    }
}
