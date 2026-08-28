import { testProvider } from "./ai-provider-router.js";

for (const name of ["openrouter", "groq", "cerebras"]) {
  console.log(JSON.stringify(await testProvider(name)));
}
