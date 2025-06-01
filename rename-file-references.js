import fs from "fs";
import path from "path";

// Folder to scan
const directoryPath = "./src"; // adjust to your project's source code folder

// Map of old names to new names
const oldToNew = new Map();

// Generate this mapping by scanning the equations folder
const equationsDir = "./public/equations";
const files = fs.readdirSync(equationsDir);

files.forEach((file) => {
  const originalName = file.replace(/_/g, " ");
  oldToNew.set(`/equations/${originalName}`, `/equations/${file}`);
});

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let replaced = false;

  oldToNew.forEach((newName, oldName) => {
    if (content.includes(oldName)) {
      content = content.replaceAll(oldName, newName);
      replaced = true;
    }
  });

  if (replaced) {
    console.log(`Updated: ${filePath}`);
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      replaceInFile(filePath);
    }
  });
}

// Start walking the directory
walkDir(directoryPath);
console.log("✅ Finished replacing references.");
