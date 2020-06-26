const debug = require('debug')('sql-partial-dump');
const _ = require('lodash');

module.exports = async function (config, outStream) {
  // IOC core
  const Core = require('./core');
  const core = new Core({
    ioc: {
      mssqlDriver: `${__dirname}/drivers/mssql.js`,
      mysqlDriver: `${__dirname}/drivers/mysql.js`,
      sqliteDriver: `${__dirname}/drivers/sqlite.js`,
    }
  });

  function output(sql) {
    if (outStream === undefined) console.log(sql);
    else outStream.write(sql + '\n');
  }

  const patchesByTable = {};
  for (const patch of config.patches || []) {
    patchesByTable[patch.table] = patchesByTable[patch.table] || [];
    patchesByTable[patch.table].push(patch.patch);
  }

  const driver = await core.load(`${config.source.type}Driver`);

  const target = config.source.type;
  const targetDriver = await core.load(`${target}Driver`);
  const pool = await driver.connect(config.source);

  function extractRelationsQueriesByTable(config) {
    const relationQueriesByTable = {};
    for (const relationQuery of config.relations || []) {
      let table = null;
      const re = /{{([^}]+?)\.([^}.]+)}}/g;
      let m;
      while (m = re.exec(relationQuery)) {
        if (!table) table = m[1].toLowerCase();
        else if (table !== m[1].toLowerCase()) throw new Error(`Wrong relation format : ${relationQuery}`);
      }
      if (!table) throw new Error(`No source table found in relation : ${relationQuery}`);
      relationQueriesByTable[table] = relationQueriesByTable[table] || [];
      relationQueriesByTable[table].push(relationQuery);
    }
    return relationQueriesByTable;
  }

  // Fetch foreign key relations
  const fkRelations = await driver.findFkRelations(pool);
  config.relations = config.relations || [];
  config.relations.push(...fkRelations);

  const relationQueriesByTable = extractRelationsQueriesByTable(config);

  function generateRelationQuery(query, entity) {
    const re = new RegExp(`{{${entity.table}\.([^}.]+)}}`, 'ig');
    const columnNamesByLowercase = _.zipObject(_.keys(entity.data).map(s => s.toLowerCase()), _.keys(entity.data));
    return query.replace(re, (ignored, col) => driver.escape(entity.data[columnNamesByLowercase[col.toLowerCase()]]));
  }

  const alreadyDoneRelationQueries = new Set();
  const alreadyDoneInsertions = new Set();

  /**
   * Returns a string unique for this entity.
   * @param entity
   */
  function hashEntity(entity) {
    if (entity.data.id) return entity.table + entity.data.id;
    return JSON.stringify(entity);
  }

  async function extractEntitiesFromQueries(queries) {
    for (const query of queries) {
      const entities = await driver.extractEntitiesFromQuery(pool, query);
      alreadyDoneRelationQueries.add(query);
      debug(`${query} : ${entities.length} results`);
      for (const entity of entities) {
        if (relationQueriesByTable[entity.table.toLowerCase()]) {
          debug(`Searching dependancies for table : ${entity.table}`);
          const queries = [];
          for (const relationQuery of relationQueriesByTable[entity.table.toLowerCase()]) {
            const query = generateRelationQuery(relationQuery, entity);
            if (alreadyDoneRelationQueries.has(query)) continue;
            queries.push(query);
          }

          if (queries.length > 0) {
            await extractEntitiesFromQueries(queries);
          }
        }

        const entityHash = hashEntity(entity);
        if (alreadyDoneInsertions.has(entityHash)) continue;
        alreadyDoneInsertions.add(entityHash);

        const patchedEntityData = _.clone(entity.data);
        for (const patch of patchesByTable[entity.table] || []) patch(patchedEntityData);
        const insertSql = targetDriver.generateInsert({table: entity.table, data: patchedEntityData});
        await output(insertSql);
      }
    }
  }

  await extractEntitiesFromQueries(config.queries);

  // Fin de la connection.
  await driver.close(pool);

  if (config.postDumpQueries) await output(config.postDumpQueries.map(q => q.replace(/[\s;]*$/, ';')).join('\n'));
};