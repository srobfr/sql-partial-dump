const mysql = require('mysql');
const debug = require('debug')('sql-partial-dump:mysql');
const _ = require('lodash');

/**
 * Driver pour Mysql
 */
function Mysql(core) {
  const that = this;

  /**
   * Ouvre une connexion à une DB Mysql
   * @param config
   * @returns {Promise<*>}
   */
  that.connect = function (config) {
    debug(`Connecting to DB...`);
    const pool = mysql.createPool({
      user: config.user,
      password: config.password,
      host: config.host,
      database: config.db,
    });

    // pool.connect();

    return Promise.resolve(pool);
  };

  /**
   * Echappe une valeur littérale
   * @param value
   * @returns {string}
   */
  that.escape = function (value) {
    if (value && value.x !== undefined && value.y !== undefined) {
      // Point mysql
      return `ST_GeomFromText('POINT(${value.x} ${value.y})')`;
    }

    return mysql.escape(value);
  };

  /**
   * Extrait une liste d'entités à partir du résultat d'une requête (qui peut contenir une jointure, donc plusieurs entités)
   * @param row
   * @param fields
   * @returns {any[]}
   */
  function rowToEntities(row, fields) {
    const entitiesByTable = new Map();
    const fieldByName = _.keyBy(fields, 'name');

    _.each(row, (value, name) => {
      const colMetadata = fieldByName[name];
      const table = colMetadata.orgTable;
      let e = entitiesByTable.get(table);
      if (!e) {
        e = {table: table, data: {}};
        entitiesByTable.set(table, e);
      }

      e.data[colMetadata.orgName] = value;
    });

    return Array.from(entitiesByTable.values());
  }

  /**
   * Extrait une liste d'entités à partir d'une requête donnée (qui peut contenir une jointure, donc plusieurs entités)
   * @param pool
   * @param sql
   * @returns {Promise<Array>}
   */
  that.extractEntitiesFromQuery = async function (pool, sql) {
    // Data query
    const {results: data, fields} = await query(pool, sql);
    const result = [];
    for (const row of data) {
      const entities = rowToEntities(row, fields);
      result.push(...entities);
    }

    return result;
  };

  function query(pool, sql) {
    return new Promise((resolve, reject) => {
      pool.query(sql, (error, results, fields) => {
        if (error) return reject(error);
        return resolve({results, fields});
      });
    });
  }

  /**
   * Recense les clés étrangères du schéma.
   * @param pool
   * @returns {Promise<Array>}
   */
  that.findFkRelations = async function (pool) {
    const sql = `SELECT
                TABLE_NAME,
                COLUMN_NAME,
                REFERENCED_COLUMN_NAME,
                REFERENCED_TABLE_NAME
            FROM
                information_schema.key_column_usage
            WHERE
                REFERENCED_TABLE_NAME IS NOT NULL`;
    const result = (await query(pool, sql)).results;
    const relationsQueries = [];
    for (const row of result) {
      relationsQueries.push(`SELECT * FROM ${mysql.escapeId(row.REFERENCED_TABLE_NAME)} WHERE ${mysql.escapeId(row.REFERENCED_COLUMN_NAME)} = {{${row.TABLE_NAME}.${row.COLUMN_NAME}}}`);
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
      keys.push(mysql.escapeId(k));
      values.push(that.escape(v));
    });

    return `INSERT INTO ${mysql.escapeId(table)} (${keys.join(', ')}) VALUES (${values.join(', ')});`;
  };

  that.generateCreateTable = async function (pool, table) {
    const sql = `SHOW CREATE TABLE ${mysql.escapeId(table)}`;
    const result = (await query(pool, sql)).results;
    return result[0]['Create Table'].replace(new RegExp(table, 'g'), table) + ';';
  };

  that.close = function (pool) {
    pool.end();
    debug(`Connection closed.`);
  }
}

module.exports = Mysql;