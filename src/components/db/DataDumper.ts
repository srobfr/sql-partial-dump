import Debug from "debug";
import MysqlConnector from "./mysql/MysqlConnector";
import { Entity } from "./types";

const debug = Debug('sql-partial-dump:DataDumper');

type progressLogType = (text: string, goToLineStart?: boolean) => void;

interface Context {
    onEntity: (entity: Entity) => void,
    alreadyFetchedEntitiesHashes: Set<string>,
    discoveryIsPending: boolean,
    toDiscover: Array<{ entity: Entity, resolve: Function, reject: Function }>,
    relations: Array<string>,
    stats: any,
    progressLog: progressLogType,
}

/**
 * Data dump engine
 */
export default class DataDumper {
    constructor(private readonly mysqlConnector: MysqlConnector) {
    }

    private async startDiscovery(context: Context) {
        let table = null;
        const batch = [];
        while (context.toDiscover.length > 0) {
            const e = context.toDiscover[0].entity;
            table = table || e.table;
            if (table !== e.table) break;
            batch.push(context.toDiscover.shift());
        }

        if (!batch.length) return;
        debug(`Discovering related entities for ${batch.length} rows from table ${table}`);

        try {
            const entities = batch.map(b => b.entity);

            const re = new RegExp(`\{\{(?<multiple>\\*)?${table}\\.(?<column>.+?)\}\}`);
            const relations = context.relations;

            for (const relation of relations) {
                const queries = new Set<string>();
                relation.replace(re, (a, b, c, d, e, groups) => {
                    debug({ a, b, c, d, e, groups });
                    if (groups.multiple) queries.add(e.replace(a, entities.map(ent => this.mysqlConnector.escapeValue(ent.data[groups.column])).join(', ')));
                    else {
                        for (const q of entities.map(ent => e.replace(a, this.mysqlConnector.escapeValue(ent.data[groups.column])))) {
                            queries.add(q);
                        }
                    }
                    return null;
                });
                if (!queries.size) continue;
                for (const s of queries) await this.processSql(s, context);
            }

            debug(`Discovered related entities for ${batch.length} rows from table ${table}`);
            for (const { resolve } of batch) resolve();
        } catch (err) {
            for (const { reject } of batch) reject(err);
        }
    }

    private async waitForEntityDiscovery(entity: Entity, context: Context) {
        await new Promise((resolve, reject) => {
            // Stack the entity for relations lookup
            context.toDiscover.push({ entity, resolve, reject });
            // Start the discoverer, if not already started
            setTimeout(() => this.startDiscovery(context), 0);
            debug(`Waiting for discovery for entity`, entity);
        });
        debug(`Waiting finished for discovery for entity`, entity);
    }

    private static generateEntityHash(entity: Entity) {
        if (entity.data.id) return entity.table + entity.data.id;
        // TODO Create hash based on primary key config
        return JSON.stringify(entity); // Fallback to JSON stringifying.
    }

    private async processFetchedEntity(entity: Entity, context: Context) {
        // Generate a unique hash for the entity
        const hash = DataDumper.generateEntityHash(entity);

        // Discard it if already seen
        if (context.alreadyFetchedEntitiesHashes.has(hash)) {
            debug(`${hash} already known.`);
            return;
        }
        context.alreadyFetchedEntitiesHashes.add(hash);

        debug(`Found entity ${hash}`);
        context.stats.fetchedCount++;
        DataDumper.printProgress(context);

        // Await entity dependancies discovery
        await this.waitForEntityDiscovery(entity, context);

        // Finally, dump the entity
        context.onEntity(entity);
        context.stats.dumpedCount++;
        DataDumper.printProgress(context);
    }

    private async processSql(sql: string, context: Context) {
        debug(`Processing sql : `, sql);
        context.stats.selectQueriesCount++;
        await this.mysqlConnector.fetchEntities(sql, entity => this.processFetchedEntity(entity, context));
    }

    private static printProgress(context: Context) {
        context.progressLog(`Dumped : ${context.stats.dumpedCount} / Fetched : ${context.stats.fetchedCount} / RAM : ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / Selects : ${context.stats.selectQueriesCount}  `, true);
    }

    /**
     * Runs the recursive dump
     */
    public async dump(initialQueries: Array<string>, relations: Array<string>, onEntity: (entity: Entity) => void, progressLog: progressLogType) {
        const startTime = (new Date()).getTime();
        const context: Context = {
            onEntity,
            alreadyFetchedEntitiesHashes: new Set<string>(),
            toDiscover: [],
            discoveryIsPending: false,
            relations,
            stats: {
                fetchedCount: 0,
                dumpedCount: 0,
                selectQueriesCount: 0,
            },
            progressLog,
        };
        const toExecute = [...initialQueries];
        for (const sql of toExecute) await this.processSql(sql, context);

        progressLog(`\nTotal SELECT queries : ${context.stats.selectQueriesCount}
Dumped entities count : ${context.stats.dumpedCount}
Duration : ${(new Date()).getTime() - startTime}ms`);
    }
}
