import { Entity } from "../db/types";

export interface Command {
    setup: (yargs: any) => void,
}

/** @deprecated The function format should be preffered because it is more versatile */
export type PatchStruct = {
    schema?: string,
    table?: string,
    patch?: (data: Entity["data"]) => Entity["data"],
}

export type PatchFunction = (entity: Entity) => Entity;
export type Patch = PatchStruct | PatchFunction;
