/**
 * IOC components definitions
 */
import Bootstrap from "./components/Bootstrap";
import CmdLineParser from "./components/CmdLineParser";
import FooCommand from "./components/commands/FooCommand";

export default {
    bootstrap: async (c) => new Bootstrap(
        await c.get('cmdLineParser') as CmdLineParser,
    ),
    cmdLineParser: async (c) => new CmdLineParser([
        c.get('fooCommand'),
    ]),

    // Commands
    fooCommand: () => new FooCommand(),
};
