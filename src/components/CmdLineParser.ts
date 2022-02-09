import Debug from "debug";
import {Command} from "./commands/types";

require('yargonaut')
    .helpStyle('green')
    .errorsStyle('red');
const yargs = require('yargs');

const debug = Debug('sql-partial-dump:CmdLineParser');

/**
 * Defines the command line options and parses it
 */
export default class CmdLineParser {
    constructor(private readonly commands: Array<Command>) {
        this.setupCommands();
    }

    private setupCommands() {
        for (const cmd of this.commands) cmd.setup(yargs);
        yargs
            .help()
            .env('SPD')
            .demandCommand()
            .recommendCommands()
            .strict()
        ;
    }

    public async run() {
        return new Promise((resolve, reject) => {
            yargs
                .onFinishCommand(resultValue => {
                    resolve(resultValue);
                })
                .parse();
        });
    }
}
