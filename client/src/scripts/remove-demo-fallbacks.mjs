// scripts/remove-demo-fallbacks.mjs
import fs from "fs";
import path from "path";

const root = process.cwd();
const srcDir = path.join(root, "src");

const fileExtensions = [".js", ".jsx", ".ts", ".tsx"];

function walk(dir) {
  let files = [];

  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (
        item === "node_modules" ||
        item === "dist" ||
        item === ".git" ||
        item === ".vite"
      ) {
        continue;
      }

      files = files.concat(walk(fullPath));
    } else if (fileExtensions.includes(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

function replaceAll(content) {
  let next = content;

  // Remove demo fallback state setters.
  next = next.replace(/setUsingDemoData\s*\(\s*true\s*\)\s*;?/g, "");
  next = next.replace(/setUsingDemoData\s*\(\s*false\s*\)\s*;?/g, "");

  // Replace demo fallback assignments with empty arrays.
  next = next.replace(
    /setAcademies\s*\(\s*demoAcademies\s*\)\s*;?/g,
    "setAcademies([]);",
  );
  next = next.replace(
    /setActivities\s*\(\s*demoActivities\s*\)\s*;?/g,
    "setActivities([]);",
  );
  next = next.replace(
    /setBookings\s*\(\s*demoBookings\s*\)\s*;?/g,
    "setBookings([]);",
  );
  next = next.replace(
    /setParents\s*\(\s*demoParents\s*\)\s*;?/g,
    "setParents([]);",
  );
  next = next.replace(
    /setChildren\s*\(\s*demoChildren\s*\)\s*;?/g,
    "setChildren([]);",
  );
  next = next.replace(/setStaff\s*\(\s*demoStaff\s*\)\s*;?/g, "setStaff([]);");
  next = next.replace(
    /setPayments\s*\(\s*demoPayments\s*\)\s*;?/g,
    "setPayments([]);",
  );
  next = next.replace(
    /setSettlements\s*\(\s*demoSettlements\s*\)\s*;?/g,
    "setSettlements([]);",
  );
  next = next.replace(
    /setRequests\s*\(\s*demoRequests\s*\)\s*;?/g,
    "setRequests([]);",
  );
  next = next.replace(
    /setCategories\s*\(\s*demoCategories\s*\)\s*;?/g,
    "setCategories([]);",
  );
  next = next.replace(
    /setBanners\s*\(\s*demoBanners\s*\)\s*;?/g,
    "setBanners([]);",
  );
  next = next.replace(/setNews\s*\(\s*demoNews\s*\)\s*;?/g, "setNews([]);");
  next = next.replace(
    /setEvents\s*\(\s*demoEvents\s*\)\s*;?/g,
    "setEvents([]);",
  );

  // Generic fallback pattern: setSomething(demoSomething)
  next = next.replace(
    /set([A-Z][A-Za-z0-9_]*)\s*\(\s*demo\1\s*\)\s*;?/g,
    "set$1([]);",
  );

  // Remove simple demo-data warning branches.
  next = next.replace(/usingDemoData\s*\?\s*["'`][^"'`]*["'`]\s*:\s*/g, "");
  next = next.replace(/usingDemoData\s*\?\s*[^:]+:\s*/g, "");

  return next;
}

const files = walk(srcDir);
let changedCount = 0;

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = replaceAll(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changedCount += 1;
    console.log(`Updated: ${path.relative(root, file)}`);
  }
}

console.log(`\nDone. Updated ${changedCount} file(s).`);
