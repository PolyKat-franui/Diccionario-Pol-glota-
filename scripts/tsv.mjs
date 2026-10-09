// Lectura y escritura de archivos TSV (tabulaciones) sin dependencias.
import { readFileSync, writeFileSync } from 'node:fs';

export function readTsv(path) {
  const lines = readFileSync(path, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = lines.shift().split('\t').map((h) => h.trim());
  return lines.map((line, i) => {
    const cells = line.split('\t');
    const row = { _line: i + 2 };
    header.forEach((h, j) => { row[h] = (cells[j] ?? '').trim(); });
    return row;
  });
}

export function writeTsv(path, header, rows) {
  const body = rows.map((r) => header.map((h) => String(r[h] ?? '').replace(/[\t\n]/g, ' ')).join('\t'));
  writeFileSync(path, [header.join('\t'), ...body].join('\n') + '\n');
}

// "a|b| c" -> ["a", "b", "c"]
export const splitMulti = (v) => String(v ?? '').split('|').map((s) => s.trim()).filter(Boolean);
