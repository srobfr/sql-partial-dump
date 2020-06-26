import * as util from 'util';

import Debug from "debug";

const debug = Debug('sql-partial-dump:Container');

interface ComponentInstance {
    initialize?: () => Promise<void>;
}
type AsyncComponentInstance = ComponentInstance | Promise<ComponentInstance>;

/**
 * IOC Container
 */
export default class Container {
    private instancesByName = {};

    constructor(private readonly configuration) {
    }

    private static initializeInstance(instance: ComponentInstance): AsyncComponentInstance {
        let r: AsyncComponentInstance = instance;
        if (instance.initialize) r = instance.initialize().then(() => instance);
        return r;
    }

    /**
     * Builds and returns an instance of the component identified by its name.
     * @param componentName
     */
    get(componentName: string | Array<string>): AsyncComponentInstance | Array<AsyncComponentInstance> {
        if (Array.isArray(componentName)) {
            // A list of components is asked.
            const instancesOrPromises = componentName.map((n) => this.get(n));
            if (instancesOrPromises.find((ip) => util.types.isPromise(ip))) {
                // There is at least one returned promise
                return Promise.all(instancesOrPromises) as Promise<ComponentInstance>;
            }

            // No promise returned.
            return instancesOrPromises as ComponentInstance;
        }

        // Only one component asked
        let instanceOrPromise = this.instancesByName[componentName];
        if (instanceOrPromise === undefined) {
            // debug(`Loading component : ${componentName}`);
            const componentBuilder = this.configuration[componentName];
            if(!componentBuilder) throw new Error(`No component definition found for "${componentName}"`);
            instanceOrPromise = componentBuilder(this);
            if (util.types.isPromise(instanceOrPromise)) {
                instanceOrPromise = instanceOrPromise.then((instance) => Container.initializeInstance(instance));
            } else {
                instanceOrPromise = Container.initializeInstance(instanceOrPromise);
            }

            this.instancesByName[componentName] = instanceOrPromise;
        }

        return instanceOrPromise;
    }
}
