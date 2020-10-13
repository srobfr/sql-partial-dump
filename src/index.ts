#!/usr/bin/env node
import Container from "./components/Container";
import ioc from "./ioc";
import Bootstrap from "./components/Bootstrap";

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
