/**
 * @file sqlFile.js
 * @description Reads database/pos_schema.sql as separate statements, the way the
 * mysql command-line client does (it follows the DELIMITER lines used for the
 * triggers and stored procedures). Lets the server create the database by itself
 * and lets upgrades reuse the exact SQL from the schema file.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SCHEMA_FILE = path.join(__dirname, '../../database/pos_schema.sql');

/**
 * Splits SQL text into statements without their delimiter.
 * Handles "DELIMITER $$" blocks, "-- comment" lines and trailing "-- comments".
 * @param {string} sql
 * @returns {string[]}
 */
function splitSql(sql) {
  const statements = [];
  let delimiter = ';';
  let current = [];

  for (const line of String(sql).replace(/\r/g, '').split('\n')) {
    const setDelimiter = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (setDelimiter) {
      delimiter = setDelimiter[1];
      continue;
    }
    // Blank and comment-only lines between statements are skipped.
    if (current.length === 0 && /^\s*(--.*)?$/.test(line)) continue;

    // The line without a trailing "-- comment" (a comment may itself contain ";").
    const code = /^\s*--/.test(line) ? '' : line.replace(/\s--\s.*$/, '').trimEnd();
    if (code.endsWith(delimiter)) {
      current.push(code.slice(0, -delimiter.length));
      statements.push(current.join('\n').trim());
      current = [];
    } else {
      current.push(line);
    }
  }
  const rest = current.join('\n').trim();
  if (rest) statements.push(rest);
  return statements.filter(Boolean);
}

/** Every statement of database/pos_schema.sql, in order. */
function schemaStatements() {
  return splitSql(fs.readFileSync(SCHEMA_FILE, 'utf8'));
}

/**
 * The one statement of pos_schema.sql that matches, e.g. /^CREATE PROCEDURE sp_create_order\b/i.
 * @param {RegExp} pattern
 * @returns {string}
 */
function schemaStatement(pattern) {
  const found = schemaStatements().find((s) => pattern.test(s));
  if (!found) throw new Error(`pos_schema.sql has no statement matching ${pattern}`);
  return found;
}

module.exports = { splitSql, schemaStatements, schemaStatement };

// TEST: splitSql('DELIMITER $$\nCREATE PROCEDURE p() BEGIN SELECT 1; END$$\nDELIMITER ;') -> ['CREATE PROCEDURE p() BEGIN SELECT 1; END']
// TEST: a trailing "-- note; with a semicolon" does not end a statement early
// TEST: schemaStatements() has 12 CREATE TABLE, 9 CREATE TRIGGER and 5 CREATE PROCEDURE statements
