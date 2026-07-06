import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist/catalog", { recursive: true });

copyFileSync("src/catalog/schema-catalog.json", "dist/catalog/schema-catalog.json");
copyFileSync("src/catalog/relationship-map.json", "dist/catalog/relationship-map.json");
