#!/usr/bin/env node
import Container from "./components/Container.js";
import ioc from "./ioc.js";
import Bootstrap from "./components/Bootstrap.js";

/**
 * sql-partial-dump boot script
 */
(async () => {
    try {
        // IOC initialization
        const container = new Container(ioc);
        const bootstrap = await container.get('bootstrap') as Bootstrap;
        await bootstrap.run();
    } catch (err) {
        // Uncatched error
        console.error(err);
    }
})();
