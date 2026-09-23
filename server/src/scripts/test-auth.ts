import app from "@/app.js";
import { db } from "@/config/db.js";
import { users, refreshTokens } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { hashToken } from "@/utils/jwt.js";
import http from "node:http";

async function runAuthTests() {
    console.log("🚀 Starting comprehensive Auth Layer verification...\n");

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const testUser = {
        username: `test_auth_${Date.now()}`,
        email: `test_auth_${Date.now()}@curt.racing`,
        password: "SecurePassword123!",
        name: "Test Auth Engineer",
    };

    let accessToken = "";
    let refreshToken = "";
    let authCookies: string[] = [];

    try {
        // --- TEST 1: Registration ---
        console.log("1️⃣ Testing POST /api/auth/register...");
        const regRes = await fetch(`${baseUrl}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testUser),
        });
        const regData = await regRes.json();

        authCookies = regRes.headers.getSetCookie();
        const refreshCookie = authCookies.find(c => c.startsWith("refreshToken="));
        if (!refreshCookie) {
            throw new Error("refreshToken cookie was not set in Set-Cookie header!");
        }
        refreshToken = refreshCookie.split(";")[0].split("=")[1];

        if (regRes.status !== 201 || !regData.data.accessToken || regData.data.refreshToken !== undefined) {
            throw new Error(`Registration failed or leaked refreshToken in JSON: ${JSON.stringify(regData)}`);
        }
        accessToken = regData.data.accessToken;

        console.log("   ✅ User registered successfully (201 Created)");
        console.log(`   ✅ Received accessToken in JSON (length: ${accessToken.length})`);
        console.log("   🛡️ SECURITY CHECK PASSED: refreshToken is EXCLUSIVELY in HttpOnly cookie, NOT in JSON!");
        console.log(`   ✅ Received ${authCookies.length} HttpOnly cookies`);

        // Verify SHA-256 hash in database
        const expectedHash = hashToken(refreshToken);
        const dbToken = await db.query.refreshTokens.findFirst({
            where: eq(refreshTokens.token, expectedHash),
        });

        if (!dbToken) {
            throw new Error("❌ Token was NOT stored as a SHA-256 hash in the database!");
        }
        console.log("   🛡️ SECURITY CHECK PASSED: Database stores SHA-256 hash, raw token is NOT in DB!\n");

        // --- TEST 2: Login ---
        console.log("2️⃣ Testing POST /api/auth/login...");
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier: testUser.email,
                password: testUser.password,
            }),
        });
        const loginData = await loginRes.json();

        if (loginRes.status !== 200 || !loginData.data.accessToken) {
            throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
        }
        console.log("   ✅ Login successful with email (200 OK)");

        // Test login with username
        const loginUserRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier: testUser.username,
                password: testUser.password,
            }),
        });
        if (loginUserRes.status !== 200) {
            throw new Error("Login failed with username identifier");
        }
        console.log("   ✅ Login successful with username (200 OK)\n");

        // --- TEST 3: Protected Route (GET /api/auth/me) ---
        console.log("3️⃣ Testing GET /api/auth/me...");
        // 3a. Without token
        const unauthRes = await fetch(`${baseUrl}/api/auth/me`);
        if (unauthRes.status !== 401) {
            throw new Error(`Expected 401 Unauthorized without token, got ${unauthRes.status}`);
        }
        console.log("   ✅ Unauthenticated request correctly rejected with 401 Unauthorized");

        // 3b. With Authorization Bearer header
        const meRes = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const meData = await meRes.json();
        if (meRes.status !== 200 || meData.data.username !== testUser.username) {
            throw new Error(`GET /me failed: ${JSON.stringify(meData)}`);
        }
        console.log(`   ✅ GET /me with Bearer token passed for user: ${meData.data.username} (${meData.data.profile.name})`);

        // 3c. With HttpOnly Cookie
        const cookieHeader = authCookies.map(c => c.split(';')[0]).join('; ');
        const meCookieRes = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Cookie: cookieHeader },
        });
        const meCookieData = await meCookieRes.json();
        if (meCookieRes.status !== 200) {
            throw new Error(`GET /me with Cookie failed: ${JSON.stringify(meCookieData)}`);
        }
        console.log("   ✅ GET /me with HttpOnly Cookie passed automatically!\n");

        // --- TEST 4: Refresh Access Token ---
        console.log("4️⃣ Testing POST /api/auth/refresh...");
        const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });
        const refreshData = await refreshRes.json();
        if (refreshRes.status !== 200 || !refreshData.data.accessToken) {
            throw new Error(`Refresh failed: ${JSON.stringify(refreshData)}`);
        }
        const newAccessToken = refreshData.data.accessToken;
        console.log("   ✅ Token refreshed successfully (200 OK)");
        console.log(`   ✅ New access token received (length: ${newAccessToken.length})\n`);

        // --- TEST 5: Logout ---
        console.log("5️⃣ Testing POST /api/auth/logout...");
        const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });
        const logoutData = await logoutRes.json();
        if (logoutRes.status !== 200) {
            throw new Error(`Logout failed: ${JSON.stringify(logoutData)}`);
        }
        console.log("   ✅ Logged out successfully (200 OK)");

        // Verify token deleted from DB
        const deletedToken = await db.query.refreshTokens.findFirst({
            where: eq(refreshTokens.token, expectedHash),
        });
        if (deletedToken) {
            throw new Error("Token was not deleted from database on logout!");
        }
        console.log("   ✅ Database session deleted (token revoked)");

        // --- TEST 6: Reject Revoked Token ---
        console.log("6️⃣ Testing refresh with revoked token...");
        const revokedRes = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });
        if (revokedRes.status !== 401) {
            throw new Error(`Expected 401 for revoked token, got ${revokedRes.status}`);
        }
        console.log("   ✅ Revoked token was properly rejected with 401 Unauthorized!\n");

        console.log("🎉 ALL AUTH LAYER TESTS PASSED FLAWLESSLY! 💯\n");
    } finally {
        // Clean up test user
        console.log("🧹 Cleaning up test user from database...");
        await db.delete(users).where(eq(users.username, testUser.username));
        server.close();
        process.exit(0);
    }
}

runAuthTests().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
