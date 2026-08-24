import { readFileSync } from 'node:fs';

const [, , manifestPath, schemaPath] = process.argv;
if (!manifestPath || !schemaPath) throw new Error('Usage: node validate-deployment-manifest.mjs <manifest> <schema>');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

function fail(path, message) { throw new Error(`Manifest ${path}: ${message}`); }
function validate(value, rule, path) {
  if (rule.const !== undefined && JSON.stringify(value) !== JSON.stringify(rule.const)) fail(path, `must equal ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.some((candidate) => JSON.stringify(candidate) === JSON.stringify(value))) fail(path, 'is not an allowed value');
  if (rule.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
    for (const key of rule.required ?? []) if (!Object.prototype.hasOwnProperty.call(value, key)) fail(path, `missing required field ${key}`);
    const properties = rule.properties ?? {};
    if (rule.additionalProperties === false) for (const key of Object.keys(value)) if (!Object.prototype.hasOwnProperty.call(properties, key)) fail(path, `contains unknown field ${key}`);
    for (const [key, child] of Object.entries(properties)) if (Object.prototype.hasOwnProperty.call(value, key)) validate(value[key], child, `${path}.${key}`);
    return;
  }
  if (rule.type === 'array') {
    if (!Array.isArray(value)) fail(path, 'must be an array');
    if (rule.items) value.forEach((item, index) => validate(item, rule.items, `${path}[${index}]`));
    return;
  }
  if (rule.type === 'string') {
    if (typeof value !== 'string') fail(path, 'must be a string');
    if (rule.minLength !== undefined && value.length < rule.minLength) fail(path, 'is too short');
    if (rule.pattern && !(new RegExp(rule.pattern).test(value))) fail(path, 'does not match its pattern');
    if (rule.format === 'date-time' && Number.isNaN(Date.parse(value))) fail(path, 'is not a date-time');
    return;
  }
  if (rule.type === 'integer' && (!Number.isInteger(value) || (rule.minimum !== undefined && value < rule.minimum) || (rule.maximum !== undefined && value > rule.maximum))) fail(path, 'must be an integer in range');
}

validate(manifest, schema, '$');
process.stdout.write('deployment manifest schema verified\n');
