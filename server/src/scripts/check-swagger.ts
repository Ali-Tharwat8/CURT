import { swaggerSpec } from "@/docs/swagger.js";

const jsonStr = JSON.stringify(swaggerSpec);
const spec = JSON.parse(jsonStr);

console.log("✅ OpenAPI Spec title:", spec.info.title, "version:", spec.info.version);
console.log("✅ Total registered paths:", Object.keys(spec.paths).length);

for (const path of Object.keys(spec.paths)) {
    const methods = Object.keys(spec.paths[path]).map(m => m.toUpperCase()).join(", ");
    console.log(`   - ${methods.padEnd(8)} ${path}`);
}

const refMatches = jsonStr.match(/"\$ref":\s*"([^"]+)"/g) || [];
console.log("\n🔍 Checking all $ref targets (total:", refMatches.length, ")...");

let brokenCount = 0;
for (const entry of refMatches) {
    const ref = entry.replace(/"\$ref":\s*"/, "").replace(/"$/, "");
    if (ref.startsWith("#/components/")) {
        const parts = ref.replace("#/components/", "").split("/");
        const section = parts[0];
        const name = parts[1];
        if (!spec.components || !spec.components[section] || !spec.components[section][name]) {
            console.error(`❌ BROKEN REF: ${ref}`);
            brokenCount++;
        }
    }
}

if (brokenCount === 0) {
    console.log("🎉 ALL $ref POINTERS RESOLVE TO VALID SCHEMAS/RESPONSES! 100% VALID!");
} else {
    console.error(`❌ Found ${brokenCount} broken references!`);
    process.exit(1);
}
