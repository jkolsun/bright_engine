const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateAndrew() {
  try {
    console.log("Updating andrew's role from ADMIN to REP...\n");
    
    // Update andrew's role
    const updated = await prisma.user.update({
      where: { email: "andrew@brightautomations.net" },
      data: { role: "REP" }
    });
    
    console.log("✅ UPDATE SUCCESSFUL\n");
    console.log("User:", {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      createdAt: updated.createdAt
    });
    
  } catch (error) {
    console.log("❌ ERROR:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAndrew();
