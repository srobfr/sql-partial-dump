const mssql = require('mssql');
const debug = require('debug')('sql-partial-dump:mssql');
const _ = require('lodash');

/**
 * Driver pour Mssql
 */
function Mssql(core) {
  const that = this;

  /**
   * Ouvre une connexion à une DB MSSQL
   * @param config
   * @returns {Promise<*>}
   */
  that.connect = async function (config) {
    debug(`Connecting to DB...`);
    const pool = await mssql.connect({
      user: config.user,
      password: config.password,
      server: `${config.host}\\${config.instance}`,
      database: config.db,
      options: {encrypt: false},
    });

    debug(`Connected to mssql DB.`);

    return pool;
  };

  /**
   * Echappe une valeur littérale
   * @param value
   * @returns {string}
   */
  that.escape = function (value) {
    if (value === true) return '1';
    if (value === false) return '0';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (value instanceof Date) return `'${value.toISOString()}'`;
    return String(value);
  };

  /**
   * Extrait une liste d'entités à partir du résultat d'une requête (qui peut contenir une jointure, donc plusieurs entités)
   * @param row
   * @param metadata
   * @returns {any[]}
   */
  function rowToEntities(row, metadata) {
    const entitiesByTable = new Map();
    _.each(row, (values, k) => {
      if (!Array.isArray(values)) values = [values];
      for (let i = 0; i < values.length; i++) {
        const colMetadata = metadata[k][i];
        const table = colMetadata.source_table;
        let e = entitiesByTable.get(table);
        if (!e) {
          e = {table: table, data: {}};
          entitiesByTable.set(table, e);
        }

        e.data[colMetadata.source_column] = values[i];
      }
    });

    return Array.from(entitiesByTable.values());
  }

  /**
   * Récupère le détail de l'analyse statique d'une requête.
   * @param pool
   * @param query
   * @returns {Promise<void>}
   */
  async function extractQueryMetadata(pool, query) {
    const metadata = await pool.request().query(`EXEC sp_describe_first_result_set N${that.escape(query)}, null, 1`);
    const r = {};
    for (const colMetadata of metadata.recordset) {
      if (!r[colMetadata.name]) r[colMetadata.name] = [];
      r[colMetadata.name].push(colMetadata);
    }
    return r;
  }

  /**
   * Extrait une liste d'entités à partir d'une requête donnée (qui peut contenir une jointure, donc plusieurs entités)
   * @param pool
   * @param query
   * @returns {Promise<Array>}
   */
  that.extractEntitiesFromQuery = async function (pool, query) {
    // Metadata extraction query
    const pMetaData = extractQueryMetadata(pool, query);

    // Data query
    const data = await pool.request().query(query);
    const metadata = await pMetaData;
    const result = [];
    for (const row of data.recordset) {
      const entities = rowToEntities(row, metadata);
      result.push(...entities);
    }

    return result;
  };

  /**
   * Recense les clés étrangères du schéma.
   * @param pool
   * @returns {Promise<Array>}
   */
  that.findFkRelations = async function (pool) {
    const sql = `SELECT
            FK_Table = FK.TABLE_NAME,
            FK_Column = CU.COLUMN_NAME,
            PK_Table = PK.TABLE_NAME,
            PK_Column = PT.COLUMN_NAME
        FROM
          INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS C
          INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS FK
            ON C.CONSTRAINT_NAME = FK.CONSTRAINT_NAME
          INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS PK
            ON C.UNIQUE_CONSTRAINT_NAME = PK.CONSTRAINT_NAME
          INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE CU
            ON C.CONSTRAINT_NAME = CU.CONSTRAINT_NAME
          INNER JOIN (
                       SELECT
                         i1.TABLE_NAME,
                         i2.COLUMN_NAME
                       FROM
                         INFORMATION_SCHEMA.TABLE_CONSTRAINTS i1
                         INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE i2
                           ON i1.CONSTRAINT_NAME = i2.CONSTRAINT_NAME
                       WHERE
                         i1.CONSTRAINT_TYPE = 'PRIMARY KEY'
                     ) PT
            ON PT.TABLE_NAME = PK.TABLE_NAME`;
    const result = await pool.request().query(sql);
    const relationsQueries = [];
    for (const row of result.recordset) {
      relationsQueries.push(`SELECT * FROM "${row.PK_Table}" WHERE "${row.PK_Column}" = {{${row.FK_Table}.${row.FK_Column}}}`);
    }

    debug(`Found ${relationsQueries.length} foreign keys.`);

    return relationsQueries;
  };

  /**
   * Génère la requête d'insertion pour l'entité donnée.
   * @param entity
   * @returns {string}
   */
  that.generateInsert = function (entity) {
    const {table, data: row} = entity;

    const keys = [];
    const values = [];

    _.each(row, (v, k) => {
      keys.push(`[${k}]`);
      values.push(that.escape(v));
    });

    return `INSERT INTO [${table}] (${keys.join(', ')}) VALUES (${values.join(', ')});`;
  };

  that.close = async function (pool) {
    await pool.close();
    debug(`Connection closed.`);
  }
}

module.exports = Mssql;