import "dotenv/config";

async function testRateLimit() {
    const baseUrl = "http://localhost:3000";
    console.log("🚀 Testing Rate Limiter on POST /api/auth/login...\n");

    let blockedAt: number | null = null;
    let rateLimitResponse: any = null;

    // Send rapid requests until blocked
    for (let i = 1; i <= 105; i++) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: "invalid_user", password: "wrong_password" }),
        });

        const rateLimitHeader = res.headers.get("ratelimit");
        const retryAfter = res.headers.get("retry-after");

        if (i === 1 || i === 25 || i === 50 || i === 75 || res.status === 429) {
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
    } else {
        console.log("❌ Rate limit was not reached within 105 requests.");
    }
}

testRateLimit().catch(console.error);
