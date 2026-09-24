import "dotenv/config";
import app from "@/app.js";
import http from "node:http";

async function testRateLimit() {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    console.log("🚀 Testing Rate Limiter on POST /api/auth/login...\n");

    let blockedAt: number | null = null;
    let rateLimitResponse: any = null;

    try {
        // Send rapid requests until blocked (100 max in dev mode)
        for (let i = 1; i <= 105; i++) {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: "invalid_user", password: "wrong_password" }),
            });

            const rateLimitHeader = res.headers.get("ratelimit");
            const retryAfter = res.headers.get("retry-after");

            if (i === 1 || i === 25 || i === 50 || i === 75 || i === 100 || res.status === 429) {
                console.log(`Request #${i.toString().padStart(3, " ")} -> Status: ${res.status} | Header: [${rateLimitHeader || "None"}] | Retry-After: ${retryAfter || "N/A"}`);
            }

            if (res.status === 429) {
                blockedAt = i;
                rateLimitResponse = await res.json();
                break;
            }
        }

        if (blockedAt) {
            console.log(`\n🛡️ RATE LIMIT TRIGGERED SUCCESSFULLY on request #${blockedAt}!`);
            console.log("Status Code: 429 Too Many Requests");
            console.log("Response Body:", JSON.stringify(rateLimitResponse, null, 2));
            server.close();
            process.exit(0);
        } else {
            console.log("❌ Rate limit was not reached within 105 requests.");
            server.close();
            process.exit(1);
        }
    } catch (err) {
        server.close();
        throw err;
    }
}

testRateLimit().catch(console.error);
