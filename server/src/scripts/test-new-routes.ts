import app from "@/app.js";
import { db } from "@/config/db.js";
import { users } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import http from "node:http";

async function verifyNewRoutes() {
    console.log("🚀 Testing all new and enhanced routes...\n");

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();
    const ownerUser = {
        username: `owner_${timestamp}`,
        email: `owner_${timestamp}@curt.racing`,
        password: "OwnerPassword123!",
        name: "Lead Engineer Owner",
    };

    const memberUser = {
        username: `member_${timestamp}`,
        email: `member_${timestamp}@curt.racing`,
        password: "MemberPassword123!",
        name: "Team Member Engineer",
    };

    try {
        // 1. Register Owner & Member
        console.log("1️⃣ Registering Owner and Member...");
        const reg1 = await fetch(`${baseUrl}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ownerUser),
        });
        const d1 = await reg1.json();
        const ownerToken = d1.data.accessToken;
        const ownerId = d1.data.user.id;

        const reg2 = await fetch(`${baseUrl}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(memberUser),
        });
        const d2 = await reg2.json();
        const memberToken = d2.data.accessToken;
        const memberId = d2.data.user.id;

        console.log("   ✅ Registered Owner & Member");

        // 2. Test Profile Endpoints (GET & PUT /api/auth/profile)
        console.log("\n2️⃣ Testing GET & PUT /api/auth/profile...");
        const profGet = await fetch(`${baseUrl}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${ownerToken}` },
        });
        const profGetData = await profGet.json();
        if (profGet.status !== 200 || profGetData.data.username !== ownerUser.username) {
            throw new Error(`GET /api/auth/profile failed: ${JSON.stringify(profGetData)}`);
        }
        console.log("   ✅ GET /api/auth/profile returned user profile correctly");

        const profPut = await fetch(`${baseUrl}/api/auth/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({
                name: "Updated Lead Engineer",
                bio: "Head of Powertrain & Telemetry",
            }),
        });
        const profPutData = await profPut.json();
        if (
            profPut.status !== 200 ||
            profPutData.data.profile.name !== "Updated Lead Engineer" ||
            profPutData.data.profile.bio !== "Head of Powertrain & Telemetry"
        ) {
            throw new Error(`PUT /api/auth/profile failed: ${JSON.stringify(profPutData)}`);
        }
        console.log("   ✅ PUT /api/auth/profile updated name and bio successfully");

        // 3. Create Project & Add Member
        console.log("\n3️⃣ Creating Project and adding member...");
        const projRes = await fetch(`${baseUrl}/api/projects`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({
                name: `Aerodynamics Package ${timestamp}`,
                description: "Ground effect tunnels and diffuser testing",
            }),
        });
        const projData = await projRes.json();
        const projectId = projData.data.id;

        await fetch(`${baseUrl}/api/projects/${projectId}/members`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({ userId: memberId }),
        });
        console.log("   ✅ Project created and member added");

        // 4. Test GET /api/projects/:id/members
        console.log("\n4️⃣ Testing GET /api/projects/:id/members...");
        const membersRes = await fetch(`${baseUrl}/api/projects/${projectId}/members`, {
            headers: { Authorization: `Bearer ${memberToken}` },
        });
        const membersData = await membersRes.json();
        if (membersRes.status !== 200 || membersData.data.length !== 2) {
            throw new Error(`GET /api/projects/:id/members failed: ${JSON.stringify(membersData)}`);
        }
        console.log(`   ✅ GET /api/projects/:id/members returned ${membersData.data.length} team members`);

        // 5. Create Tasks and Test GET /api/projects/:id/progress
        console.log("\n5️⃣ Creating tasks and testing GET /api/projects/:id/progress...");
        const t1 = await fetch(`${baseUrl}/api/projects/${projectId}/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({
                title: "Wind Tunnel Calibration",
                priority: "High",
                status: "Done",
                assignedTo: memberId,
            }),
        });
        const task1Data = await t1.json();
        const taskId1 = task1Data.data.id;

        const t2 = await fetch(`${baseUrl}/api/projects/${projectId}/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({
                title: "CFD Mesh Convergence",
                priority: "Medium",
                status: "In progress",
                assignedTo: memberId,
            }),
        });
        const task2Data = await t2.json();
        const taskId2 = task2Data.data.id;

        const progressRes = await fetch(`${baseUrl}/api/projects/${projectId}/progress`, {
            headers: { Authorization: `Bearer ${memberToken}` },
        });
        const progressData = await progressRes.json();
        if (
            progressRes.status !== 200 ||
            progressData.data.totalTasks !== 2 ||
            progressData.data.completedTasks !== 1 ||
            progressData.data.completionPercentage !== 50
        ) {
            throw new Error(`GET /api/projects/:id/progress failed: ${JSON.stringify(progressData)}`);
        }
        console.log(
            `   ✅ GET /api/projects/:id/progress calculated metrics: totalTasks=${progressData.data.totalTasks}, completedTasks=${progressData.data.completedTasks}, completionRate=${progressData.data.completionPercentage}%`
        );

        // 6. Test GET /api/tasks/my
        console.log("\n6️⃣ Testing GET /api/tasks/my...");
        const myTasksRes = await fetch(`${baseUrl}/api/tasks/my?status=In%20progress`, {
            headers: { Authorization: `Bearer ${memberToken}` },
        });
        const myTasksData = await myTasksRes.json();
        if (myTasksRes.status !== 200 || myTasksData.data.length !== 1 || myTasksData.data[0].id !== taskId2) {
            throw new Error(`GET /api/tasks/my failed: ${JSON.stringify(myTasksData)}`);
        }
        console.log(`   ✅ GET /api/tasks/my returned member's task: '${myTasksData.data[0].title}'`);

        // 7. Test PATCH /api/tasks/:id/assign
        console.log("\n7️⃣ Testing PATCH /api/tasks/:id/assign...");
        // Reassign task 1 to owner
        const assignRes = await fetch(`${baseUrl}/api/tasks/${taskId1}/assign`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({ assignedTo: ownerId }),
        });
        const assignData = await assignRes.json();
        if (assignRes.status !== 200 || assignData.data.assignee.id !== ownerId) {
            throw new Error(`PATCH /api/tasks/:id/assign failed: ${JSON.stringify(assignData)}`);
        }
        console.log(`   ✅ PATCH /api/tasks/:id/assign reassigned task to Owner successfully`);

        // Unassign task 2 (pass null)
        const unassignRes = await fetch(`${baseUrl}/api/tasks/${taskId2}/assign`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ownerToken}`,
            },
            body: JSON.stringify({ assignedTo: null }),
        });
        const unassignData = await unassignRes.json();
        if (unassignRes.status !== 200 || unassignData.data.assignee !== null) {
            throw new Error(`PATCH /api/tasks/:id/assign (unassign) failed: ${JSON.stringify(unassignData)}`);
        }
        console.log(`   ✅ PATCH /api/tasks/:id/assign unassigned task (assignedTo: null) successfully`);

        // 8. Test Role filtering on projects (GET /api/projects?role=owner & /owned)
        console.log("\n8️⃣ Testing Project Role Filters (?role=owner & ?role=member)...");
        const roleOwnerRes = await fetch(`${baseUrl}/api/projects?role=owner`, {
            headers: { Authorization: `Bearer ${memberToken}` },
        });
        const roleOwnerData = await roleOwnerRes.json();
        if (roleOwnerData.data.length !== 0) {
            throw new Error("Member should not have any owned projects");
        }

        const roleMemberRes = await fetch(`${baseUrl}/api/projects?role=member`, {
            headers: { Authorization: `Bearer ${memberToken}` },
        });
        const roleMemberData = await roleMemberRes.json();
        if (roleMemberData.data.length !== 1) {
            throw new Error("Member should have 1 member project");
        }

        const ownedConvenienceRes = await fetch(`${baseUrl}/api/projects/owned`, {
            headers: { Authorization: `Bearer ${ownerToken}` },
        });
        const ownedConvenienceData = await ownedConvenienceRes.json();
        if (ownedConvenienceData.data.length < 1) {
            throw new Error("Owner should have at least 1 owned project via /projects/owned");
        }
        console.log("   ✅ Both ?role=owner|member and /projects/owned alias work accurately");

        console.log("\n🎉 ALL NEW ROUTES VERIFIED AND WORKING 100% PERFECTLY! 🚀");
    } finally {
        await db.delete(users).where(eq(users.username, ownerUser.username));
        await db.delete(users).where(eq(users.username, memberUser.username));
        server.close();
        process.exit(0);
    }
}

verifyNewRoutes().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
