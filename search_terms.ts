import fs from 'fs';
import path from 'path';

function walk(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walk('./src');
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('custom_orders') || line.includes('stitch_orders') || line.includes('customOrders') || line.includes('stitchOrders')) {
      console.log(`${file}:${idx + 1}: ${line.trim()}`);
    }
  });
}
