import { db } from "@/config/db.js";
import { users, profiles, refreshTokens, projects, projectMembers, tasks } from "@/db/schema.js";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seed() {
  console.log("🌱 Starting Database Seeding with CURT Racing Team Data...\n");

  try {
    // 1. Clear existing data to guarantee clean, idempotent seeding
    console.log("🧹 Step 1: Clearing existing records...");
    await db.execute(sql`
      TRUNCATE TABLE 
        tasks, 
        project_members, 
        projects, 
        refresh_tokens, 
        profiles, 
        users 
      RESTART IDENTITY CASCADE;
    `);

    // 2. Hash default password for all mock users
    const defaultPassword = "CurtPassword123!";
    console.log(`🔐 Step 2: Hashing default password ("${defaultPassword}") with bcrypt...`);
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 3. Insert 10 Realistic Users
    console.log("👥 Step 3: Inserting 10 Team Members...");
    const teamMembersData = [
      { username: "karim_amr", email: "karim@curt.racing", name: "Karim Amr", bio: "Aerodynamics Sub-Team Lead | CFD Mesh Optimization Specialist" },
      { username: "nour_tarek", email: "nour@curt.racing", name: "Nour Tarek", bio: "Chassis & Composites Engineer | Carbon Fiber Layup Lead" },
      { username: "youssef_ali", email: "youssef@curt.racing", name: "Youssef Ali", bio: "Powertrain Lead | Inverter & Dual-Motor Integration" },
      { username: "salma_mostafa", email: "salma@curt.racing", name: "Salma Mostafa", bio: "Vehicle Dynamics & Suspension Lead | Kinematics Modeling" },
      { username: "omar_khaled", email: "omar@curt.racing", name: "Omar Khaled", bio: "Embedded Systems Lead | High-Speed CAN Bus Architecture" },
      { username: "mariam_hassan", email: "mariam@curt.racing", name: "Mariam Hassan", bio: "Battery Management System (BMS) & Thermal Control Engineer" },
      { username: "ahmed_fathy", email: "ahmed@curt.racing", name: "Ahmed Fathy", bio: "Manufacturing & CNC Machining Lead | Upright Assemblies" },
      { username: "hana_ezzat", email: "hana@curt.racing", name: "Hana Ezzat", bio: "Aerodynamics Analyst | Wind Tunnel Testing & Surface Pressure" },
      { username: "ziad_mahmoud", email: "ziad@curt.racing", name: "Ziad Mahmoud", bio: "Autonomous Driving Engineer | LiDAR SLAM & Path Planning" },
      { username: "laila_sherif", email: "laila@curt.racing", name: "Laila Sherif", bio: "Brakes & Cooling Lead | Regenerative Braking Coordination" },
    ];

    const insertedUsers = await db
      .insert(users)
      .values(
        teamMembersData.map((m) => ({
          username: m.username,
          email: m.email,
          passwordHash,
        }))
      )
      .returning();

    // Map username to user ID for easy reference
    const userMap = new Map<string, string>();
    insertedUsers.forEach((u) => userMap.set(u.username, u.id));

    // 4. Insert Companion Profiles (1:1 with Users)
    console.log("📋 Step 4: Creating User Profiles...");
    await db.insert(profiles).values(
      teamMembersData.map((m) => ({
        userId: userMap.get(m.username)!,
        name: m.name,
        bio: m.bio,
      }))
    );

    // 5. Insert Sample Refresh Tokens (Active + Expired for Testing)
    console.log("🔑 Step 5: Generating Sample Refresh Tokens (Active & Expired)...");
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const refreshTokensData = [
      {
        userId: userMap.get("karim_amr")!,
        token: "curt_refresh_token_karim_active_sample_2027",
        expiresAt: sevenDaysFromNow,
      },
      {
        userId: userMap.get("nour_tarek")!,
        token: "curt_refresh_token_nour_active_sample_2027",
        expiresAt: sevenDaysFromNow,
      },
      {
        userId: userMap.get("youssef_ali")!,
        token: "curt_refresh_token_youssef_active_sample_2027",
        expiresAt: sevenDaysFromNow,
      },
      {
        userId: userMap.get("karim_amr")!,
        token: "curt_refresh_token_karim_expired_sample_test",
        expiresAt: yesterday, // Intentionally expired for testing 401 Unauthorized
      },
    ];

    await db.insert(refreshTokens).values(refreshTokensData);

    // 6. Insert 4 Major Engineering Projects
    console.log("🏎️ Step 6: Creating 4 Engineering Projects...");
    const projectsData = [
      {
        name: "CFRP Monocoque Chassis 2027",
        description: "Design, structural FEA analysis, and autoclave layup of the carbon fiber monocoque chassis compliant with FSAE rules.",
        createdBy: userMap.get("nour_tarek")!,
      },
      {
        name: "High-Downforce Aero Package & CFD",
        description: "Front wing, rear wing with DRS actuator, and sidepod undertray optimization in ANSYS Fluent to maximize downforce in tight corners.",
        createdBy: userMap.get("karim_amr")!,
      },
      {
        name: "600V EV Battery Pack & BMS",
        description: "Liquid-cooled cylindrical cell accumulator pack with custom distributed Battery Management System and ISO26262 compliance.",
        createdBy: userMap.get("youssef_ali")!,
      },
      {
        name: "Autonomous Driving & CAN Telemetry",
        description: "Stereo camera and LiDAR perception pipeline running on NVIDIA Jetson with real-time wireless CAN-bus telemetry.",
        createdBy: userMap.get("omar_khaled")!,
      },
    ];

    const insertedProjects = await db.insert(projects).values(projectsData).returning();

    const pMonocoque = insertedProjects[0]!;
    const pAero = insertedProjects[1]!;
    const pPowertrain = insertedProjects[2]!;
    const pAutonomous = insertedProjects[3]!;

    // 6. Insert Project Memberships (Owners + Cross-functional Members)
    console.log("🤝 Step 6: Assigning Project Memberships (Owners & Members)...");
    const membershipsData = [
      // Monocoque Project
      { projectId: pMonocoque.id, userId: userMap.get("nour_tarek")!, role: "owner" as const },
      { projectId: pMonocoque.id, userId: userMap.get("ahmed_fathy")!, role: "member" as const },
      { projectId: pMonocoque.id, userId: userMap.get("salma_mostafa")!, role: "member" as const },
      { projectId: pMonocoque.id, userId: userMap.get("karim_amr")!, role: "member" as const },

      // Aero Package Project
      { projectId: pAero.id, userId: userMap.get("karim_amr")!, role: "owner" as const },
      { projectId: pAero.id, userId: userMap.get("hana_ezzat")!, role: "member" as const },
      { projectId: pAero.id, userId: userMap.get("nour_tarek")!, role: "member" as const },

      // Powertrain & Battery Project
      { projectId: pPowertrain.id, userId: userMap.get("youssef_ali")!, role: "owner" as const },
      { projectId: pPowertrain.id, userId: userMap.get("mariam_hassan")!, role: "member" as const },
      { projectId: pPowertrain.id, userId: userMap.get("laila_sherif")!, role: "member" as const },

      // Autonomous & Telemetry Project
      { projectId: pAutonomous.id, userId: userMap.get("omar_khaled")!, role: "owner" as const },
      { projectId: pAutonomous.id, userId: userMap.get("ziad_mahmoud")!, role: "member" as const },
      { projectId: pAutonomous.id, userId: userMap.get("mariam_hassan")!, role: "member" as const },
    ];

    await db.insert(projectMembers).values(membershipsData);

    // 7. Insert 16 Detailed Tasks Across All Projects
    console.log("📝 Step 7: Creating 16 Detailed Tasks with Statuses & Priorities...");
    const tasksData = [
      // Tasks for Project 1: Monocoque Chassis
      {
        projectId: pMonocoque.id,
        assignedTo: userMap.get("nour_tarek")!,
        title: "Front Bulkhead 20g Crash Simulation",
        description: "Run non-linear dynamic impact simulation in ANSYS LS-DYNA to verify FSAE energy absorption requirements.",
        priority: "High" as const,
        status: "Done" as const,
      },
      {
        projectId: pMonocoque.id,
        assignedTo: userMap.get("ahmed_fathy")!,
        title: "CNC Mold Machining for Nose Cone",
        description: "Machine high-density tooling board for the monocoque front nose cone on the 5-axis CNC router.",
        priority: "High" as const,
        status: "In progress" as const,
      },
      {
        projectId: pMonocoque.id,
        assignedTo: userMap.get("salma_mostafa")!,
        title: "Hardpoint Suspension Pickup Geometry",
        description: "Verify double wishbone pickup bolt hardpoints on the chassis sides for 4g bump loads.",
        priority: "Medium" as const,
        status: "In progress" as const,
      },
      {
        projectId: pMonocoque.id,
        assignedTo: userMap.get("nour_tarek")!,
        title: "Torsional Rigidity Physical Test Bench",
        description: "Fabricate test fixture to measure chassis torsional stiffness in Nm/deg before race season.",
        priority: "Medium" as const,
        status: "To Do" as const,
      },

      // Tasks for Project 2: Aero Package
      {
        projectId: pAero.id,
        assignedTo: userMap.get("karim_amr")!,
        title: "Multi-Element Front Wing Airfoil Selection",
        description: "Analyze Selig S1223 vs Wortmann airfoils at Reynolds number 300,000 using XFLR5.",
        priority: "High" as const,
        status: "Done" as const,
      },
      {
        projectId: pAero.id,
        assignedTo: userMap.get("hana_ezzat")!,
        title: "Full Car CFD Mesh Convergence Study",
        description: "Generate 25 million poly-hexcore mesh in Fluent to resolve boundary layer y+ < 1.",
        priority: "High" as const,
        status: "In progress" as const,
      },
      {
        projectId: pAero.id,
        assignedTo: userMap.get("hana_ezzat")!,
        title: "DRS Pneumatic Actuator Mount Design",
        description: "Design 3D-printed titanium actuator bracket for rapid rear wing flap opening under straightline braking.",
        priority: "Medium" as const,
        status: "To Do" as const,
      },
      {
        projectId: pAero.id,
        assignedTo: userMap.get("karim_amr")!,
        title: "Ground Effect Diffuser Strakes Angle Optimization",
        description: "Simulate pitch sensitivity and ride height changes between 25mm and 45mm front clearance.",
        priority: "Low" as const,
        status: "To Do" as const,
      },

      // Tasks for Project 3: EV Powertrain
      {
        projectId: pPowertrain.id,
        assignedTo: userMap.get("youssef_ali")!,
        title: "Inverter Space Vector PWM Tuning",
        description: "Calibrate Field-Oriented Control (FOC) switching algorithms on the dual permanent magnet motors.",
        priority: "High" as const,
        status: "Done" as const,
      },
      {
        projectId: pPowertrain.id,
        assignedTo: userMap.get("mariam_hassan")!,
        title: "BMS Optical Isolation Board Verification",
        description: "Test SPI communication integrity between master and slave BMS boards under 600V galvanic isolation.",
        priority: "High" as const,
        status: "In progress" as const,
      },
      {
        projectId: pPowertrain.id,
        assignedTo: userMap.get("laila_sherif")!,
        title: "Battery Cooling Jacket Flow Rate Simulation",
        description: "CFD analysis of water-glycol coolant distribution across 140 cylindrical cell segments.",
        priority: "Medium" as const,
        status: "In progress" as const,
      },
      {
        projectId: pPowertrain.id,
        assignedTo: userMap.get("youssef_ali")!,
        title: "High-Voltage Pre-Charge Relay Circuit Testing",
        description: "Validate 100-ohm ceramic pre-charge resistor time constant and interlock switch operation.",
        priority: "Low" as const,
        status: "To Do" as const,
      },

      // Tasks for Project 4: Autonomous & Telemetry
      {
        projectId: pAutonomous.id,
        assignedTo: userMap.get("omar_khaled")!,
        title: "1 Mbps CAN-FD Bus Transceiver Wiring",
        description: "Terminate differential transmission lines with 120-ohm resistors across wheel speed sensors.",
        priority: "High" as const,
        status: "Done" as const,
      },
      {
        projectId: pAutonomous.id,
        assignedTo: userMap.get("ziad_mahmoud")!,
        title: "Cone Detection Model TensorRT Optimization",
        description: "Quantize YOLOv8 model to INT8 precision for 60 FPS real-time inference on NVIDIA Orin.",
        priority: "High" as const,
        status: "In progress" as const,
      },
      {
        projectId: pAutonomous.id,
        assignedTo: userMap.get("ziad_mahmoud")!,
        title: "LiDAR Point Cloud Ground Plane Filtering",
        description: "Implement RANSAC surface plane segmentation to isolate track boundary cones.",
        priority: "Medium" as const,
        status: "To Do" as const,
      },
      {
        projectId: pAutonomous.id,
        assignedTo: userMap.get("mariam_hassan")!,
        title: "Autonomous Mission Status LED Indicator",
        description: "Integrate emergency shutdown (ASMS) multi-color LED bar with ISO 26262 diagnostic codes.",
        priority: "Low" as const,
        status: "Done" as const,
      },
    ];

    await db.insert(tasks).values(tasksData);

    console.log("\n========================================================");
    console.log("🎉 CURT DATABASE SEEDED SUCCESSFULLY!");
    console.log("========================================================");
    console.log(`✅ Users Created:          ${teamMembersData.length}`);
    console.log(`✅ Profiles Created:       ${teamMembersData.length}`);
    console.log(`✅ Refresh Tokens Created: ${refreshTokensData.length}`);
    console.log(`✅ Projects Created:       ${projectsData.length}`);
    console.log(`✅ Memberships Assigned:   ${membershipsData.length}`);
    console.log(`✅ Tasks Created:          ${tasksData.length}`);
    console.log("--------------------------------------------------------");
    console.log("🔑 All users share password: CurtPassword123!");
    console.log("📧 Example logins:");
    console.log("   - karim@curt.racing (or username: karim_amr)");
    console.log("   - nour@curt.racing  (or username: nour_tarek)");
    console.log("   - youssef@curt.racing (or username: youssef_ali)");
    console.log("🎟️ Sample Active Refresh Tokens (Expires in 7 days):");
    console.log("   - curt_refresh_token_karim_active_sample_2027");
    console.log("   - curt_refresh_token_nour_active_sample_2027");
    console.log("🎟️ Sample Expired Refresh Token (For Testing 401):");
    console.log("   - curt_refresh_token_karim_expired_sample_test");
    console.log("========================================================\n");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
}

seed();
