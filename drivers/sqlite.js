const _ = require('lodash');

/**
 * Driver pour Sqlite
 */
function Sqlite(core) {
  const that = this;

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
   * Génère la requête d'insertion pour l'entité donnée.
   * @param entity
   * @returns {string}
   */
  that.generateInsert = function (entity) {
    const {table, data: row} = entity;

    const keys = [];
    const values = [];

    _.each(row, (v, k) => {
      keys.push(`"${k}"`);
      values.push(that.escape(v));
    });

    return `INSERT INTO "${table}" (${keys.join(', ')}) VALUES (${values.join(', ')});`;
  };
}

module.exports = Sqlite;