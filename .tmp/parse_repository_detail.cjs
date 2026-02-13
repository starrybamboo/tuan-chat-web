const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('app/components/repository/detail/repositoryDetail.tsx','utf8');
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx','typescript'] });
  console.log('ok');
} catch (e) {
  console.error(e.message);
  if (e.loc) {
    console.error('loc', e.loc);
    const lines = code.split(/\r?\n/);
    const start = Math.max(0, e.loc.line - 3);
    const end = Math.min(lines.length, e.loc.line + 2);
    for (let i = start; i < end; i++) {
      console.error(String(i + 1).padStart(4) + ': ' + lines[i]);
    }
  }
}