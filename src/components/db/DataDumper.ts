import Debug from "debug";
import MysqlConnector from "./mysql/MysqlConnector";
import {Entity} from "./types";

const debug = Debug('sql-partial-dump:DataDumper');

type progressLogType = (text: string, goToLineStart?: boolean) => void;

interface Context {
    onEntity: (entity: Entity) => void,
    alreadyProcessedEntitiesHashes: Set<string>,
    toDiscoverByTable: Map<string, Set<Entity>>,
    pendingDiscoveriesByTable: Map<string, Promise<any>>,
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

    /**
     * Discover related entities for a same-table entities batch.
     */
    private async discovery(table: string, context: Context) {
        const entities = context.toDiscoverByTable.get(table);
        if (!entities) return;
        context.toDiscoverByTable.delete(table); // Leaves place for the next batch.

        debug(`Discovering related entities for ${entities.size} rows from table ${table}`);

        const re = new RegExp(`\{\{(?<multiple>\\*)?${table}\\.(?<column>.+?)\}\}`);
        for (const relation of context.relations) {
            const s = relation.replace(re, (a, b, c, d, e, groups) => {
                if (groups.multiple) return Array.from(entities)
                    .map(e => this.mysqlConnector.escapeValue(e.data[groups.column]))
                    .join(', ');
                return this.mysqlConnector.escapeValue(e.data[groups.column]);
            });
            if (s === relation) continue;

            await this.processSql(s, context);
        }

        debug(`Discovered related entities for ${entities.size} rows from table ${table}`);

        // TODO Handle cycle in relations graph at table level
        await this.discovery(table, context);
    }

    private async waitForEntityDiscovery(entity: Entity, context: Context) {
        // Stack the entity for relations lookup
        if (!context.toDiscoverByTable.has(entity.table)) context.toDiscoverByTable.set(entity.table, new Set());
        context.toDiscoverByTable.get(entity.table).add(entity);

        let shouldCleanup = false;
        if (!context.pendingDiscoveriesByTable.has(entity.table)) {
            debug(entity);
            // Trigger the discovery for this table
            context.pendingDiscoveriesByTable.set(entity.table, this.discovery(entity.table, context));
            shouldCleanup = true;
        }

        // Await the table discovery.
        debug(`Waiting for the discovery to finish on table ${entity.table}`);
        await context.pendingDiscoveriesByTable.get(entity.table);
        debug(`Discovery finished on table ${entity.table}`);

        if (shouldCleanup) context.pendingDiscoveriesByTable.delete(entity.table);
    }

    private static generateEntityHash(entity: Entity) {
        if (entity.data.id) return entity.table + entity.data.id;
        // TODO Create hash based on primary key config
        return JSON.stringify(entity); // Fallback to JSON stringifying.
    }

    private async processEntity(entity: Entity, context: Context) {
        // Generate a unique hash for the entity
        const hash = DataDumper.generateEntityHash(entity);

        // Discard it if already seen
        if (context.alreadyProcessedEntitiesHashes.has(hash)) return;
        context.alreadyProcessedEntitiesHashes.add(hash);

        debug(`Found entity ${hash}`);
        context.stats.discoveredCount++;
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
        await this.mysqlConnector.fetchEntities(sql, entity => this.processEntity(entity, context));
    }

    private static printProgress(context: Context) {
        context.progressLog(`Dumped : ${context.stats.dumpedCount} / Discovered : ${context.stats.discoveredCount} / RAM : ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, true);
    }

    /**
     * Runs the recursive dump
     */
    public async dump(initialQueries: Array<string>, relations: Array<string>, onEntity: (entity: Entity) => void, progressLog: progressLogType) {
        const startTime = (new Date()).getTime();
        const context: Context = {
            onEntity,
            alreadyProcessedEntitiesHashes: new Set<string>(),
            toDiscoverByTable: new Map(),
            pendingDiscoveriesByTable: new Map(),
            relations,
            stats: {
                discoveredCount: 0,
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
