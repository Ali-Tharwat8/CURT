import app from "@/app.js";
import { db } from "@/config/db.js";
import { users } from "@/db/schema.js";
import { inArray } from "drizzle-orm";
import http from "node:http";

async function runTaskTests() {
    console.log("🚀 Starting comprehensive Task Layer (Task 3) verification...\n");

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();
    const userA = {
        username: `task_owner_${timestamp}`,
        email: `task_owner_${timestamp}@curt.racing`,
        password: "SecurePassword123!",
        name: "Lead Aero Engineer",
    };
    const userB = {
        username: `task_member_${timestamp}`,
        email: `task_member_${timestamp}@curt.racing`,
        password: "SecurePassword123!",
        name: "Aero Analyst B",
    };
    const userC = {
        username: `task_outsider_${timestamp}`,
        email: `task_outsider_${timestamp}@curt.racing`,
        password: "SecurePassword123!",
        name: "Powertrain Outsider C",
    };

    let tokenA = "";
    let tokenB = "";
    let tokenC = "";
    let userBId = "";
    let userCId = "";
    let projectId = "";
    let task1Id = "";
    let task2Id = "";

    try {
        // Step 1: Register 3 test users
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
        const dataC = await resC.json();
        tokenC = dataC.data.accessToken;
        userCId = dataC.data.user.id;
        console.log("   ✅ All 3 test engineers registered\n");

        // Step 2: Owner A creates project & invites Member B
        console.log("2️⃣ Setting up project and team membership...");
        const projRes = await fetch(`${baseUrl}/api/projects`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenA}`,
            },
            body: JSON.stringify({
                name: "DRS Actuator Design",
                description: "Rear wing DRS pneumatic mechanism",
            }),
        });
        const projData = await projRes.json();
        projectId = projData.data.id;

        await fetch(`${baseUrl}/api/projects/${projectId}/members`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenA}`,
            },
            body: JSON.stringify({ userId: userBId }),
        });
        console.log(`   ✅ Project created (ID: ${projectId}) with Member B enrolled\n`);

        // Step 3: Assignment Integrity Test (Owner tries to assign task to non-member Outsider C)
        console.log("3️⃣ Testing Task Assignment Integrity (Assign to non-member Outsider C)...");
        const invalidAssignRes = await fetch(`${baseUrl}/api/projects/${projectId}/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenA}`,
            },
            body: JSON.stringify({
                title: "Invalid Assignment Task",
                assignedTo: userCId, // Outsider!
            }),
        });
        const invalidAssignData = await invalidAssignRes.json();
        if (invalidAssignRes.status !== 400 || !invalidAssignData.message.includes("member")) {
            throw new Error(`Assignment integrity check failed! Expected 400 Bad Request, got: ${invalidAssignRes.status}`);
        }
        console.log("   🛡️ ASSIGNMENT INTEGRITY PASSED: Non-member rejected with 400 Bad Request\n");

        // Step 4: Owner creates task assigned to Member B
        console.log("4️⃣ Testing POST /api/projects/:id/tasks (Owner creates valid task assigned to Member B)...");
        const createRes = await fetch(`${baseUrl}/api/projects/${projectId}/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenA}`,
            },
            body: JSON.stringify({
                title: "FEA Structural Analysis on Flap Mounts",
                description: "Simulate 500N aerodynamic downforce on carbon flap mounts",
                priority: "High",
                status: "To Do",
                assignedTo: userBId,
            }),
        });
        const createData = await createRes.json();
        if (createRes.status !== 201 || !createData.data.id) {
            throw new Error(`Failed to create task: ${JSON.stringify(createData)}`);
        }
        task1Id = createData.data.id;
        console.log(`   ✅ Task created: '${createData.data.title}' (ID: ${task1Id})\n`);

        // Step 5: List project tasks with filtering & pagination
        console.log("5️⃣ Testing GET /api/projects/:id/tasks (Filtering by status and priority)...");
        const listRes = await fetch(`${baseUrl}/api/projects/${projectId}/tasks?status=To Do&priority=High&page=1&limit=10`, {
            headers: { Authorization: `Bearer ${tokenB}` },
        });
        const listData = await listRes.json();
        if (listRes.status !== 200 || !Array.isArray(listData.data) || listData.pagination.total !== 1) {
            throw new Error(`Task list failed: ${JSON.stringify(listData)}`);
        }
        console.log(`   ✅ Query Engine works: Found ${listData.pagination.total} matching task with pagination\n`);

        // Step 6: Access control on GET /api/tasks/:id
        console.log("6️⃣ Testing GET /api/tasks/:id (Member vs Outsider access control)...");
        const memberGetRes = await fetch(`${baseUrl}/api/tasks/${task1Id}`, {
            headers: { Authorization: `Bearer ${tokenB}` },
        });
        if (memberGetRes.status !== 200) {
            throw new Error(`Member failed to read task: ${memberGetRes.status}`);
        }
        console.log("   ✅ Member B successfully viewed task details");

        const outsiderGetRes = await fetch(`${baseUrl}/api/tasks/${task1Id}`, {
            headers: { Authorization: `Bearer ${tokenC}` },
        });
        if (outsiderGetRes.status !== 403) {
            throw new Error(`Outsider was not blocked! Got: ${outsiderGetRes.status}`);
        }
        console.log("   🛡️ RBAC CHECK: Outsider C blocked with 403 Forbidden\n");

        // Step 7: Member tries to edit task details (Owner-only action)
        console.log("7️⃣ Testing PUT /api/tasks/:id (Member B attempts to edit task title)...");
        const memberEditRes = await fetch(`${baseUrl}/api/tasks/${task1Id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenB}`,
            },
            body: JSON.stringify({ title: "Hacked Task Title by Member" }),
        });
        if (memberEditRes.status !== 403) {
            throw new Error(`Member was allowed to edit task! Status: ${memberEditRes.status}`);
        }
        console.log("   🛡️ RBAC CHECK: Member B prevented from updating task details (403 Forbidden)\n");

        // Step 8: Member tries to delete task (Owner-only action)
        console.log("8️⃣ Testing DELETE /api/tasks/:id (Member B attempts to delete task)...");
        const memberDeleteRes = await fetch(`${baseUrl}/api/tasks/${task1Id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${tokenB}` },
        });
        if (memberDeleteRes.status !== 403) {
            throw new Error(`Member was allowed to delete task! Status: ${memberDeleteRes.status}`);
        }
        console.log("   🛡️ RBAC CHECK: Member B prevented from deleting task (403 Forbidden)\n");

        // Step 9: Member attempts to update status of someone else's task
        console.log("9️⃣ Testing PATCH /api/tasks/:id/status (Member B attempts status update on another member's task)...");
        // Create Task 2 unassigned (or assigned to Owner A)
        const task2Res = await fetch(`${baseUrl}/api/projects/${projectId}/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenA}`,
            },
            body: JSON.stringify({
                title: "Owner Only Assembly Task",
                priority: "Low",
                status: "To Do",
            }),
        });
        task2Id = (await task2Res.json()).data.id;

        const unauthorizedStatusRes = await fetch(`${baseUrl}/api/tasks/${task2Id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenB}`,
            },
            body: JSON.stringify({ status: "In progress" }),
        });
        if (unauthorizedStatusRes.status !== 403) {
            throw new Error(`Member was allowed to update someone else's task status! Status: ${unauthorizedStatusRes.status}`);
        }
        console.log("   🛡️ RBAC CHECK: Member B prevented from updating status on task not assigned to them (403 Forbidden)\n");

        // Step 10: Member updates status of their assigned task
        console.log("🔟 Testing PATCH /api/tasks/:id/status (Member B updates status on their OWN assigned task)...");
        const memberStatusRes = await fetch(`${baseUrl}/api/tasks/${task1Id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenB}`,
            },
            body: JSON.stringify({ status: "In progress" }),
        });
        const memberStatusData = await memberStatusRes.json();
        if (memberStatusRes.status !== 200 || memberStatusData.data.status !== "In progress") {
            throw new Error(`Member failed to update assigned task status: ${JSON.stringify(memberStatusData)}`);
        }
        console.log("   ✅ Member B successfully updated assigned task status to 'In progress'\n");

        // Step 11: Owner updates task title and priority
        console.log("1️⃣1️⃣ Testing PUT /api/tasks/:id (Owner updates task title and priority)...");
        const ownerUpdateRes = await fetch(`${baseUrl}/api/tasks/${task1Id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenA}`,
            },
            body: JSON.stringify({
                title: "FEA Structural Analysis on Flap Mounts - Phase 2",
                priority: "Low",
            }),
        });
        const ownerUpdateData = await ownerUpdateRes.json();
        if (ownerUpdateRes.status !== 200 || ownerUpdateData.data.title !== "FEA Structural Analysis on Flap Mounts - Phase 2") {
            throw new Error(`Owner failed to update task: ${JSON.stringify(ownerUpdateData)}`);
        }
        console.log("   ✅ Owner A successfully updated task metadata\n");

        // Step 12: Owner deletes task
        console.log("1️⃣2️⃣ Testing DELETE /api/tasks/:id (Owner deletes task)...");
        const deleteRes = await fetch(`${baseUrl}/api/tasks/${task1Id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${tokenA}` },
        });
        if (deleteRes.status !== 200) {
            throw new Error(`Owner failed to delete task: ${deleteRes.status}`);
        }
        console.log("   ✅ Task deleted successfully\n");

        console.log("🎉 ALL TASK LAYER (TASK 3) INTEGRATION TESTS PASSED FLAWLESSLY! 💯\n");
    } finally {
        // Clean up test data
        console.log("🧹 Cleaning up test users and project from database...");
        await db.delete(users).where(inArray(users.email, [userA.email, userB.email, userC.email]));
        await new Promise<void>((resolve) => server.close(() => resolve()));
        process.exit(0);
    }
}

runTaskTests().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
