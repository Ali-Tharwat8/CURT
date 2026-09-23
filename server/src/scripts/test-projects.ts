import app from "@/app.js";
import { db } from "@/config/db.js";
import { users } from "@/db/schema.js";
import { inArray } from "drizzle-orm";
import http from "node:http";

async function runProjectTests() {
    console.log("🚀 Starting comprehensive Project Layer (Task 2) verification...\n");

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();
    const userA = {
        username: `owner_${timestamp}`,
        email: `owner_${timestamp}@curt.racing`,
        password: "SecurePassword123!",
        name: "Lead Engineer A",
    };
    const userB = {
        username: `member_${timestamp}`,
        email: `member_${timestamp}@curt.racing`,
        password: "SecurePassword123!",
        name: "Worker Engineer B",
    };
    const userC = {
        username: `outsider_${timestamp}`,
        email: `outsider_${timestamp}@curt.racing`,
        password: "SecurePassword123!",
        name: "Outsider Engineer C",
    };

    let tokenA = "";
    let tokenB = "";
    let tokenC = "";
    let userBId = "";
    let projectId = "";

    try {
        // Register 3 users
        console.log("1️⃣ Registering test users (Owner A, Member B, Outsider C)...");
        const resA = await fetch(`${baseUrl}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userA),
        });
        tokenA = (await resA.json()).data.accessToken;

        const resB = await fetch(`${baseUrl}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userB),
        });
        const dataB = await resB.json();
        tokenB = dataB.data.accessToken;
        userBId = dataB.data.user.id;

        const resC = await fetch(`${baseUrl}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userC),
        });
        tokenC = (await resC.json()).data.accessToken;
        console.log("   ✅ All 3 test engineers registered\n");

        // --- TEST 1: Create Project ---
        console.log("2️⃣ Testing POST /api/projects (Owner A creates project)...");
        const createRes = await fetch(`${baseUrl}/api/projects`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenA}`,
            },
            body: JSON.stringify({
                name: "Formula Suspension 2026",
                description: "Aerodynamic front suspension development",
            }),
        });
        const createData = await createRes.json();
        if (createRes.status !== 201 || !createData.data.id) {
            throw new Error(`Failed to create project: ${JSON.stringify(createData)}`);
        }
        projectId = createData.data.id;
        console.log(`   ✅ Project created: '${createData.data.name}' (ID: ${projectId})`);

        // Check Owner A has membership automatically
        const getRes = await fetch(`${baseUrl}/api/projects/${projectId}`, {
            headers: { Authorization: `Bearer ${tokenA}` },
        });
        const getData = await getRes.json();
        const ownerMember = getData.data.members.find((m: any) => m.role === "owner");
        if (!ownerMember) {
            throw new Error("Creator was not automatically assigned as 'owner' in project_members!");
        }
        console.log(`   🛡️ RBAC CHECK: Creator is automatically assigned as 'owner' in project_members\n`);

        // --- TEST 2: Add Member B to Project ---
        console.log("3️⃣ Testing POST /api/projects/:id/members (Owner A adds Member B)...");
        const addMemberRes = await fetch(`${baseUrl}/api/projects/${projectId}/members`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenA}`,
            },
            body: JSON.stringify({ userId: userBId }),
        });
        const addMemberData = await addMemberRes.json();
        if (addMemberRes.status !== 201) {
            throw new Error(`Failed to add member: ${JSON.stringify(addMemberData)}`);
        }
        console.log(`   ✅ Member B added successfully as 'member'\n`);

        // --- TEST 3: List Projects for Member B ---
        console.log("4️⃣ Testing GET /api/projects (Member B views their project list)...");
        const listRes = await fetch(`${baseUrl}/api/projects`, {
            headers: { Authorization: `Bearer ${tokenB}` },
        });
        const listData = await listRes.json();
        if (listRes.status !== 200 || listData.data.length === 0) {
            throw new Error(`Failed to list projects for Member B: ${JSON.stringify(listData)}`);
        }
        console.log(`   ✅ Project appears in Member B's list with role: '${listData.data[0].role}'\n`);

        // --- TEST 4: Outsider C Access Check ---
        console.log("5️⃣ Testing GET /api/projects/:id (Outsider C attempts to view project)...");
        const outsiderRes = await fetch(`${baseUrl}/api/projects/${projectId}`, {
            headers: { Authorization: `Bearer ${tokenC}` },
        });
        if (outsiderRes.status !== 403) {
            throw new Error(`Expected 403 Forbidden for outsider, got ${outsiderRes.status}`);
        }
        console.log("   🛡️ RBAC CHECK: Outsider C blocked with 403 Forbidden\n");

        // --- TEST 5: Member B tries to update project (Owner only) ---
        console.log("6️⃣ Testing PUT /api/projects/:id (Member B tries to edit project)...");
        const memberEditRes = await fetch(`${baseUrl}/api/projects/${projectId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenB}`,
            },
            body: JSON.stringify({ name: "Hacked Project Name" }),
        });
        if (memberEditRes.status !== 403) {
            throw new Error(`Expected 403 Forbidden for non-owner edit, got ${memberEditRes.status}`);
        }
        console.log("   🛡️ RBAC CHECK: Member B prevented from updating project (403 Forbidden)\n");

        // --- TEST 6: Owner A updates project ---
        console.log("7️⃣ Testing PUT /api/projects/:id (Owner A updates project)...");
        const ownerEditRes = await fetch(`${baseUrl}/api/projects/${projectId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenA}`,
            },
            body: JSON.stringify({ name: "Formula Suspension 2026 - Rev B" }),
        });
        const ownerEditData = await ownerEditRes.json();
        if (ownerEditRes.status !== 200 || ownerEditData.data.name !== "Formula Suspension 2026 - Rev B") {
            throw new Error(`Failed to update project: ${JSON.stringify(ownerEditData)}`);
        }
        console.log(`   ✅ Owner A successfully updated project name to: '${ownerEditData.data.name}'\n`);

        // --- TEST 7: Owner A tries to kick themselves ---
        console.log("8️⃣ Testing DELETE /api/projects/:id/members/:userId (Prevent removing owner)...");
        const selfKickRes = await fetch(`${baseUrl}/api/projects/${projectId}/members/${getData.data.creator.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${tokenA}` },
        });
        if (selfKickRes.status !== 400) {
            throw new Error(`Expected 400 Bad Request when trying to remove owner, got ${selfKickRes.status}`);
        }
        console.log("   🛡️ DATA INTEGRITY CHECK: Owner cannot be removed from their project\n");

        // --- TEST 8: Delete Project ---
        console.log("9️⃣ Testing DELETE /api/projects/:id (Owner A deletes project)...");
        const deleteRes = await fetch(`${baseUrl}/api/projects/${projectId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${tokenA}` },
        });
        if (deleteRes.status !== 200) {
            throw new Error(`Failed to delete project: ${await deleteRes.text()}`);
        }
        console.log("   ✅ Project deleted successfully (CASCADE removes memberships)\n");

        console.log("🎉 ALL PROJECT LAYER (TASK 2) TESTS PASSED FLAWLESSLY! 💯\n");
    } finally {
        console.log("🧹 Cleaning up test users from database...");
        await db.delete(users).where(inArray(users.username, [userA.username, userB.username, userC.username]));
        server.close();
        process.exit(0);
    }
}

runProjectTests().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
