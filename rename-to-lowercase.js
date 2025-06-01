import fs from 'fs';
import path from 'path';

const directoryPath = path.join(process.cwd(), 'public/equations');

function renameToLowercase(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const oldPath = path.join(dir, file);

    if (fs.lstatSync(oldPath).isDirectory()) {
      // Recursively handle subfolders
      renameToLowercase(oldPath);
    } else {
      const lowerCaseName = file.toLowerCase();

      // Rename only if name has uppercase letters
      if (file !== lowerCaseName) {
        const newPath = path.join(dir, lowerCaseName);
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed: ${file} → ${lowerCaseName}`);
      }
    }
  });
}

renameToLowercase(directoryPath);
console.log('✅ All files renamed to lowercase!');
