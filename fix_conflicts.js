const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === '.next') return;
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const files = walk('.');
let fixedCount = 0;

for (const file of files) {
    if (!fs.statSync(file).isFile()) continue;
    try {
        let content = fs.readFileSync(file, 'utf8');
        if (content.includes('<<<<<<< HEAD')) {
            const regex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> [0-9a-fA-F]+\r?\n?/g;
            const newContent = content.replace(regex, '$2');
            if (newContent !== content) {
                fs.writeFileSync(file, newContent, 'utf8');
                console.log('Fixed ' + file);
                fixedCount++;
            }
        }
    } catch (e) {
    }
}
console.log('Fixed ' + fixedCount + ' files.');
