import Debug from "debug";

const debug = Debug('sql-partial-dump:Bootstrap');

/**
 * Application bootstrap service.
 */
export default class Bootstrap {
    constructor(private readonly cmdLineParser, ...ignored) {
        // "ignored" contain service instances provided by the IOC configuration.
        // This way, those services are initialized before this component (LoopbackBootstrap) is instanciated.
    }

    async run() {
        await this.cmdLineParser.run();
    }
}
