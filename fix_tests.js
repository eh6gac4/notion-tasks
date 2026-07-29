const fs = require('fs');

function replaceInFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // TaskCreate.test.tsx の locationOptions 追加
  if (file.includes('TaskCreate.test.tsx')) {
    content = content.replace(/<TaskCreate tagOptions=\{TAG_OPTIONS\} \/>/g, '<TaskCreate tagOptions={TAG_OPTIONS} locationOptions={[]} />');
  }

  // bump-version.test.ts の @ts-expect-error 削除
  if (file.includes('bump-version.test.ts')) {
    content = content.replace(/\/\/ @ts-expect-error.*/g, '');
  }

  // notion.test.ts の mock.calls.map の型エラー修正
  if (file.includes('notion.test.ts')) {
    content = content.replace(/c: \[\{ block_id: string \}\]/g, 'c: any');
    content = content.replace(/c: \[\{ children: Array<\{ paragraph\?: \{ rich_text: Array<\{ text: \{ content: string \} \}> \} \}> \}\]/g, 'c: any');
  }

  // Task モックの location: null と icon: null 追加
  const mockRegex = /function makeTask\([\s\S]*?return \{([\s\S]*?)\n\s*\}/g;
  content = content.replace(mockRegex, (match, body) => {
    let newBody = body;
    if (!newBody.includes('location:')) {
      newBody = newBody.replace(/sourceUrl: null,/, 'location: null,\n    sourceUrl: null,');
    }
    if (!newBody.includes('icon:')) {
      newBody = newBody.replace(/status:/, 'icon: null,\n    status:');
    }
    return match.replace(body, newBody);
  });

  if (content !== fs.readFileSync(file, 'utf8')) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const path = dir + '/' + f;
    if (fs.statSync(path).isDirectory()) {
      walk(path);
    } else if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      replaceInFile(path);
    }
  }
}

walk('./src/components/__tests__');
walk('./src/constants/__tests__');
walk('./src/lib/__tests__');
