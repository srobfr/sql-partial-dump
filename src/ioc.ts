import Bootstrap from "./components/Bootstrap";
import CmdLineParser from "./components/CmdLineParser";
import DumpCommand from "./components/commands/DumpCommand";
import MysqlConnector from "./components/db/mysql/MysqlConnector";
import MysqlRelationsFinder from "./components/db/mysql/MysqlRelationsFinder";
import DataDumper from "./components/db/DataDumper";
import MysqlDumper from "./components/db/mysql/MysqlDumper";

/**
 * IOC configuration
 */
export default {
    bootstrap: async (c) => new Bootstrap(
        await c.get('cmdLineParser') as CmdLineParser,
    ),
    cmdLineParser: async (c) => new CmdLineParser([
        await c.get('dumpCommand'),
    ]),

    // DB connectors
    mysqlConnector: () => new MysqlConnector(),

    // Commands
    dumpCommand: async (c) => new DumpCommand(
        await c.get('mysqlConnector') as MysqlConnector,
        await c.get('mysqlRelationsFinder') as MysqlRelationsFinder,
        await c.get('mysqlDumper') as MysqlDumper,
        await c.get('dataDumper') as DataDumper,
    ),

    // Services
    mysqlRelationsFinder: async (c) => new MysqlRelationsFinder(await c.get('mysqlConnector') as MysqlConnector),
    mysqlDumper: async (c) => new MysqlDumper(await c.get('mysqlConnector') as MysqlConnector),
    dataDumper: async (c) => new DataDumper(await c.get('mysqlConnector') as MysqlConnector),
};
