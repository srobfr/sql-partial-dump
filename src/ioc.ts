import Bootstrap from "./components/Bootstrap";
import CmdLineParser from "./components/CmdLineParser";
import DumpCommand from "./components/commands/DumpCommand";
import MysqlConnector from "./components/db/mysql/MysqlConnector";
import MysqlRelationsFinder from "./components/db/mysql/MysqlRelationsFinder";
import MysqlDumper from "./components/db/mysql/MysqlDumper";
import EmptyCommand from "./components/commands/EmptyCommand";

/**
 * IOC configuration
 */
export default {
    bootstrap: async (c) => new Bootstrap(
        await c.get('cmdLineParser') as CmdLineParser,
    ),
    cmdLineParser: async (c) => new CmdLineParser([
        await c.get('dumpCommand'),
        await c.get('emptyCommand'),
    ]),

    // DB connectors
    mysqlConnector: () => new MysqlConnector(),

    // Commands
    dumpCommand: async (c) => new DumpCommand(
        await c.get('mysqlConnector') as MysqlConnector,
        await c.get('mysqlRelationsFinder') as MysqlRelationsFinder,
        await c.get('mysqlDumper') as MysqlDumper
    ),
    emptyCommand: async (c) => new EmptyCommand(
        await c.get('mysqlConnector') as MysqlConnector
    ),

    // Services
    mysqlRelationsFinder: async (c) => new MysqlRelationsFinder(await c.get('mysqlConnector') as MysqlConnector),
    mysqlDumper: async (c) => new MysqlDumper(await c.get('mysqlConnector') as MysqlConnector),
};
