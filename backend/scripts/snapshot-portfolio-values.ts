import { prisma } from "../src/database/prisma";
import { portfolioService } from "../src/services/portfolio.service";

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });

  let captured = 0;
  for (const user of users) {
    await portfolioService.captureDailySnapshot(user.id);
    captured += 1;
  }

  console.log(`Captured daily portfolio snapshots for ${captured} user(s).`);
}

main()
  .catch((err) => {
    console.error("Failed to capture portfolio snapshots:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
