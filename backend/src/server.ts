import { env } from "@/config/env";
import app from "@/app";

app.listen(Number(env.PORT), () => {
  console.log(`Finsight API running on http://localhost:${env.PORT}`);
});

