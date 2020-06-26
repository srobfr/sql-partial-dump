import Debug from "debug";

const debug = Debug('sql-partial-dump:FooCommand');

/**
 * Example command
 */
export default class FooCommand {
    public setup(yargs) {
        yargs.command('foo <port> [-v|--verbose]', 'Executes the foo command',
            yargs => {
                yargs
                    .positional('port', {
                        describe: 'port to bind on',
                        default: 5000
                    });
            },
            argv => this.execute(argv))
            .option('verbose', {
                alias: 'v',
                type: '',
                description: 'Run with verbose logging'
            });
    }

    private async execute(argv) {
        debug(argv);
    }
}
