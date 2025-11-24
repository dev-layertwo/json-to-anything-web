
/**
 * json-anything - ES module with 25 dependency-free converters
 * Each function accepts a JS object (or array of objects) and returns a string representation.
 */

// utility helpers
function ensureArray(obj){ return Array.isArray(obj) ? obj : [obj]; }
function keysUnion(arr){ return [...new Set(arr.flatMap(o=>Object.keys(o)))]; }
function escCSV(v){
  if(v===null||v===undefined) return "";
  const s = String(v);
  if(s.includes(",")||s.includes('"')||s.includes("\n")) return '"'+s.replace(/"/g,'""')+'"';
  return s;
}
function inferType(v){
  if(v===null) return 'any';
  if(Array.isArray(v)) return inferType(v[0]??'any')+'[]';
  switch(typeof v){
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'object': return 'object';
    default: return 'any';
  }
}

// 1 YAML (naive)
export function toYAML(obj){
  function ser(v, lvl){
    const pad = '  '.repeat(lvl);
    if(v===null) return 'null';
    if(typeof v === 'string') return v;
    if(typeof v === 'number' || typeof v === 'boolean') return String(v);
    if(Array.isArray(v)){
      if(v.length===0) return '[]';
      return v.map(item=> pad + '- ' + (typeof item === 'object' ? '\n' + ser(item, lvl+1) : item)).join('\n');
    }
    if(typeof v === 'object'){
      const keys = Object.keys(v);
      if(keys.length===0) return '{}';
      return keys.map(k=> {
        const val = v[k];
        if(typeof val === 'object') return pad + k + ':\n' + ser(val, lvl+1);
        return pad + k + ': ' + val;
      }).join('\n');
    }
    return String(v);
  }
  return ser(obj,0);
}

// 2 CSV
export function toCSV(obj){
  const arr = ensureArray(obj);
  if(arr.length === 0) return "";
  const keys = keysUnion(arr);
  const rows = arr.map(o => keys.map(k=> escCSV(o[k])).join(','));
  return keys.join(',') + '\n' + rows.join('\n');
}

// 3 TypeScript Interface (simple)
export function toTypeScript(obj, name='RootObject'){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  let out = `export interface ${name} {\n`;
  for(const k of Object.keys(example)){
    out += `  ${k}: ${inferType(example[k])};\n`;
  }
  out += `}\n`;
  return out;
}

// 4 JS Pretty
export function toJS(obj){ return JSON.stringify(obj, null, 2); }

// 5 Schema summary
export function toSchemaSummary(obj){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  return Object.entries(example).map(([k,v])=> `${k}: ${inferType(v)}`).join('\n');
}

// 6 HTML Table
export function toHTMLTable(obj){
  const arr = ensureArray(obj);
  const keys = keysUnion(arr);
  let html = '<table class="jtab"><thead><tr>'+keys.map(k=>`<th>${k}</th>`).join('')+'</tr></thead><tbody>';
  html += arr.map(o=>'<tr>'+keys.map(k=>`<td>${o[k]??''}</td>`).join('')+'</tr>').join('');
  html += '</tbody></table>';
  return html;
}

// 7 Query Params
export function toQuery(obj){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  const parts = Object.entries(example).map(([k,v])=> `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length?('?'+parts.join('&')):'';
}

// 8 URL-encoded Form
export function toFormURLEncoded(obj){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  return Object.entries(example).map(([k,v])=> `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

// 9 .properties
export function toProperties(obj){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  return Object.entries(example).map(([k,v])=> `${k}=${v}`).join('\n');
}

// 10 Markdown Table
export function toMarkdownTable(obj){
  const arr = ensureArray(obj);
  const keys = keysUnion(arr);
  const head = '| ' + keys.join(' | ') + ' |';
  const sep = '| ' + keys.map(()=> '---').join(' | ') + ' |';
  const rows = arr.map(o=> '| ' + keys.map(k=> (o[k]??'')).join(' | ') + ' |').join('\n');
  return head + '\n' + sep + '\n' + rows;
}

// 11 PlantUML Class (simple)
export function toPlantUML(obj, name='Root'){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  let out = `class ${name} {\n`;
  for(const k of Object.keys(example)) out += `  ${k}\n`;
  out += `}\n`;
  return out;
}

// 12 Mermaid Class Diagram (basic)
export function toMermaid(obj, name='Root'){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  let out = 'classDiagram\n';
  out += `class ${name} {\n`;
  for(const k of Object.keys(example)) out += `  ${k}\n`;
  out += '}\n';
  return out;
}

// 13 HTML Table (duplicate of 6 but kept)
export { toHTMLTable as toHTML };

// 14-16 SQL Inserts (SQLite/MySQL/Postgres) - same SQL
export function toSQLInsert(obj, table='mytable'){
  const arr = ensureArray(obj);
  return arr.map(o=> {
    const cols = Object.keys(o).join(',');
    const vals = Object.values(o).map(v=> typeof v==='string' ? `'${String(v).replace(/'/g,"''")}'` : (v===null?'NULL':v)).join(',');
    return `INSERT INTO ${table} (${cols}) VALUES (${vals});`;
  }).join('\n');
}
export function toSQLiteInsert(obj, table='mytable'){ return toSQLInsert(obj, table); }
export function toMySQLInsert(obj, table='mytable'){ return toSQLInsert(obj, table); }
export function toPostgresInsert(obj, table='mytable'){ return toSQLInsert(obj, table); }

// 17 Bash export variables
export function toBashExport(obj){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  return Object.entries(example).map(([k,v])=> `export ${k}='${String(v).replace(/'/g,"'\"'\"'")}'`).join('\n');
}

// 18 C# Class
export function toCSharp(obj, name='Root'){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  let out = `public class ${name} {\n`;
  for(const k of Object.keys(example)) out += `  public ${typeof example[k] === 'number' ? 'int' : typeof example[k] === 'boolean' ? 'bool' : 'string'} ${k} { get; set; }\n`;
  out += '}\n';
  return out;
}

// 19 Java Class
export function toJava(obj, name='Root'){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  let out = `public class ${name} {\n`;
  for(const k of Object.keys(example)) out += `  public ${typeof example[k] === 'number' ? 'int' : typeof example[k] === 'boolean' ? 'boolean' : 'String'} ${k};\n`;
  out += '}\n';
  return out;
}

// 20 Python Dataclass
export function toPythonDataclass(obj, name='Root'){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  let out = 'from dataclasses import dataclass\n\n';
  out += `@dataclass\nclass ${name}:\n`;
  for(const k of Object.keys(example)) out += `  ${k}: ${typeof example[k] === 'number' ? 'int' : typeof example[k] === 'boolean' ? 'bool' : 'str'}\n`;
  return out;
}

// 21 Go Struct
export function toGoStruct(obj, name='Root'){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  let out = `type ${name} struct {\n`;
  for(const k of Object.keys(example)) out += `  ${k} ${typeof example[k] === 'number' ? 'int' : typeof example[k] === 'boolean' ? 'bool' : 'string'} \`json:"${k}"\`\n`;
  out += '}\n';
  return out;
}

// 22 Rust Struct
export function toRustStruct(obj, name='Root'){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  let out = `struct ${name} {\n`;
  for(const k of Object.keys(example)) out += `  ${k}: ${typeof example[k] === 'number' ? 'i32' : typeof example[k] === 'boolean' ? 'bool' : 'String'},\n`;
  out += '}\n';
  return out;
}

// 23 Dart Class
export function toDartClass(obj, name='Root'){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  let out = `class ${name} {\n`;
  for(const k of Object.keys(example)) out += `  final ${typeof example[k] === 'number' ? 'int' : typeof example[k] === 'boolean' ? 'bool' : 'String'} ${k};\n`;
  out += `  ${name}({${Object.keys(example).map(k=>'required this.'+k).join(', ')}});\n`;
  out += '}\n';
  return out;
}

// 24 PHP Array
export function toPHPArray(obj){
  return JSON.stringify(obj, null, 2).replace(/\\n/g, '\\n').replace(/"/g, '"');
}

// 25 Protocol Buffers (proto3) - naive
export function toProto(obj, name='Root'){
  const example = Array.isArray(obj) ? (obj[0] || {}) : (obj || {});
  let out = `syntax = "proto3";\nmessage ${name} {\n`;
  let i=1;
  for(const k of Object.keys(example)){
    const t = typeof example[k] === 'number' ? 'int32' : typeof example[k] === 'boolean' ? 'bool' : 'string';
    out += `  ${t} ${k} = ${i};\n`; i++;
  }
  out += '}\n';
  return out;
}

