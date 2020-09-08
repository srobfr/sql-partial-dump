export interface DbConnectionConfiguration {
    host: string;
    schema: string;
    user: string;
    password: string;
}

export interface Entity {
    table: string;
    data: { [key: string]: any };
}
