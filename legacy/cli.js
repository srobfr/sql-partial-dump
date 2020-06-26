#!/usr/bin/env node
(async function () {
  const [, , ...argv] = process.argv;
  if (argv.length !== 1) throw new Error(`A configuration script path is required.`);
  const config = require(argv[0]);
  const partialDump = require('./index');
  await partialDump(config, process.stdout);
})().catch(err => console.error(err.stack));
