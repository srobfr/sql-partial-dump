export interface DbConnectionConfiguration {
    host: string;
    schema: string;
    user: string;
    password: string;
}

export interface Entity {
    schema: string;
    table: string;
    data: { [key: string]: any };
}
