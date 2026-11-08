import { Request, Response, NextFunction } from "express";
import { streamChatOllama } from "@/ai/ollama.service";
import { buildFinancialContext, serializeContext } from "@/ai/context.serializer";
import { prisma } from "@/database/prisma";
import { AppError } from "@/middlewares/error.middleware";
import { transcribeAudioBuffer } from "@/services/whisper.service";
import { detectAndCalculateMath } from "@/utils/financialMath";

// ── System prompt factory ─────────────────────────────────────────────────────

function buildSystemPrompt(contextStr: string, mathCalculationBlock: string | null = null): string {
  const mathSection = mathCalculationBlock
    ? `\n## Verified Backend Calculations (Deterministic Financial Math Engine):\n${mathCalculationBlock}\n- MANDATORY: Always quote and rely on these exact figures above for any numerical, EMI, or affordability questions. Never recalculate or invent different numbers.\n`
    : "";

  return `You are FinAI, an intelligent, empathetic, beginner-friendly, and financially precise personal finance advisor built into FinSight.

## Conversational Guidelines:
- Handle simple conversational pleasantries (e.g. "Hi", "Hello", "Hey", "Good morning", "Thanks") warmly, briefly, and naturally (e.g., "Hello! How can I help you with your finances today?"). Never launch into unsolicited onboarding questions or financial reviews for a simple greeting.
- Speak in complete, grammatically correct, natural sentences with proper punctuation.
- Structure answers: Give a direct, helpful answer first, followed by concise reasoning and practical examples where useful.
- Keep responses concise and conversational (typically 2 to 4 sentences). Avoid robotic filler or overly long essays.
- Write numbers, amounts, and currency naturally (e.g., ₹500, ₹2.5 lakh, ₹1 crore) so they sound clear when spoken aloud.
- When answering follow-up questions, seamlessly reference previous context from the chat history.
- For unclear, unsupported, or non-financial topics (e.g. general coding, weather, sports), politely clarify that you are FinSight's personal finance companion and offer to help with money, budgeting, investments, or financial planning.

## Financial Advisory Scope:
1. Financial Education:
   - Explain equity, debt, stocks, bonds, mutual funds, ETFs, SIP, FD, gold, compounding, inflation, credit cards, EMI, credit score (CIBIL), insurance, and taxes in simple English with practical INR examples.
2. Personal Finance Analysis:
   - Provide precise insights on the user's income, expenses, category spending, budget limits, savings goals, investment holdings, and FinScore (covering savings rate, budget discipline, emergency fund, investments, and debt ratio).
3. Affordability Analysis:
   - When asked if the user can afford a car, phone, holiday, or home, evaluate their actual monthly cash flow surplus, existing budget allocations, and liquid savings. If crucial information (such as income or down payment) is unrecorded, clearly ask follow-up questions.
4. Suggestions & Recommendations:
   - Suggest actionable ways to trim discretionary spending, build emergency buffers, manage debt, and set goal targets. Always tailor advice to their risk profile and never promise guaranteed market returns.
${mathSection}
## User's Verified Financial Snapshot (Real-time):
${contextStr}

## Core Rules & Guardrails:
- Base ALL personalized responses strictly on the verified snapshot above. NEVER fabricate, hallucinate, or assume unlisted financial figures.
- Distinguish missing or "Unavailable" metrics from actual zero values. If an asset class, budget, or debt is marked "Unavailable", gently inform the user that it hasn't been set up yet rather than assuming they have 0 debt or 0 assets.
- Never expose another user's financial data.

## Action Protocol:
If the user explicitly asks to add, record, or delete a transaction (e.g. "add ₹400 for groceries", "spent 250 on coffee yesterday", "delete transaction 42"), append a single fenced JSON block at the very end of your response:

\`\`\`json
{ "action": "CREATE_TRANSACTION", "payload": { "amount": 400, "category": "Food", "type": "EXPENSE", "description": "Groceries", "date": "2026-10-24T00:00:00.000Z" } }
\`\`\`

Action Block Rules:
- "action" must be either "CREATE_TRANSACTION" or "DELETE_TRANSACTION".
- For DELETE_TRANSACTION, payload must be { "id": <number> }.
- "type" must be "INCOME" or "EXPENSE".
- "category" must match standard categories (e.g. Food, Transport, Shopping, Bills, Healthcare, Entertainment, Education, Salary, Investment, Other).
- "amount" must be a positive number.
- "date": If a specific date is mentioned (e.g. "yesterday", "on Oct 12"), convert to ISO 8601 string. If no date is specified, omit "date".
- Do NOT output action blocks unless the user unambiguously requested a transaction mutation.
- The UI presents an interactive confirmation card before anything is saved.

## Boundaries:
- Never provide speculative stock price forecasts or guarantee investment returns.
- Always append this disclaimer if discussing specific investments:
  ⚠️ Not financial advice — for informational purposes only.`;
}

export const aiController = {
  async chat(req: Request, res: Response, next: NextFunction) {
    let sseFlushed = false;
    const abortController = new AbortController();

    // Abort Ollama stream if the client terminates the connection
    req.on("close", () => {
      abortController.abort();
    });

    try {
      const { message, history = [] } = req.body;

      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }

      // 1. Sanitize & validate chat history
      const safeHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
      if (Array.isArray(history)) {
        for (const item of history.slice(-20)) {
          if (
            item &&
            typeof item === "object" &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string"
          ) {
            safeHistory.push({
              role: item.role,
              content: item.content.slice(0, 4000),
            });
          }
        }
      }

      // 2. Fetch fresh user-scoped financial context
      const ctx = await buildFinancialContext(req.userId!);
      const contextStr = serializeContext(ctx);
      const mathCalculationBlock = detectAndCalculateMath(
        message.trim(),
        ctx.income,
        ctx.expense,
        ctx.availableSavings
      );
      const systemPrompt = buildSystemPrompt(contextStr, mathCalculationBlock);

      const messages = [
        { role: "system", content: systemPrompt },
        ...safeHistory,
        { role: "user", content: message.trim().slice(0, 4000) },
      ];

      // 3. Open SSE stream
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      sseFlushed = true;

      // 4. Stream from Ollama with cancellation support
      const ollamaRes = await streamChatOllama(messages, abortController.signal);

      if (!ollamaRes.body) {
        res.write("data: [ERROR] AI service returned empty stream\n\n");
        res.end();
        return;
      }

      const reader = ollamaRes.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = "";

      while (true) {
        if (abortController.signal.aborted) {
          reader.cancel().catch(() => {});
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const chunk = JSON.parse(trimmed) as {
              message?: { content?: string };
              done?: boolean;
            };

            const text = chunk.message?.content ?? "";
            if (text) {
              const escaped = text.replace(/\n/g, "\\n");
              res.write(`data: ${escaped}\n\n`);
            }

            if (chunk.done) {
              res.write("data: [DONE]\n\n");
              res.end();
              return;
            }
          } catch {
            // Skip malformed chunk silently
          }
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      if (abortController.signal.aborted) {
        return;
      }
      if (sseFlushed) {
        res.write(`data: [ERROR] ${err.message || "Failed to generate AI response"}\n\n`);
        res.end();
      } else {
        next(err);
      }
    }
  },

  /**
   * Secure server-side validation and execution of AI action proposals.
   * Verifies data types, category mappings, dates, positive amounts,
   * and strict record ownership before database mutation.
   */
  async executeAction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const { action, payload } = req.body;

      if (!action || !payload || typeof payload !== "object") {
        return res.status(400).json({ error: "Valid action and payload are required" });
      }

      if (action === "CREATE_TRANSACTION") {
        const { amount, category, type, description, date } = payload;
        const numAmount = Number(amount);

        if (isNaN(numAmount) || numAmount <= 0 || numAmount > 100_000_000) {
          return res.status(400).json({ error: "Invalid transaction amount. Must be a positive number." });
        }

        const safeType = type === "INCOME" ? "INCOME" : type === "EXPENSE" ? "EXPENSE" : null;
        if (!safeType) {
          return res.status(400).json({ error: "Transaction type must be INCOME or EXPENSE." });
        }

        // Validate or parse date safely
        let txDate = new Date();
        if (date) {
          const parsed = new Date(date);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2000 && parsed.getFullYear() <= 2100) {
            txDate = parsed;
          }
        }

        // Resolve or match category
        const catName = typeof category === "string" ? category.trim() : "";
        let matchedCat = await prisma.category.findFirst({
          where: {
            name: { equals: catName },
            type: safeType,
          },
        });

        if (!matchedCat && catName) {
          matchedCat = await prisma.category.findFirst({
            where: {
              name: { contains: catName },
              type: safeType,
            },
          });
        }

        if (!matchedCat) {
          matchedCat = await prisma.category.findFirst({
            where: { type: safeType },
          });
        }

        if (!matchedCat) {
          return res.status(400).json({ error: `Could not determine valid category for '${catName}'` });
        }

        const safeDesc = typeof description === "string" ? description.trim().slice(0, 255) : "";

        // Execute creation atomically
        const createdTx = await prisma.$transaction(async (tx: any) => {
          return tx.transaction.create({
            data: {
              userId,
              type: safeType,
              amount: numAmount,
              categoryId: matchedCat.id,
              description: safeDesc,
              date: txDate,
            },
            include: { category: true },
          });
        });

        return res.status(201).json({
          success: true,
          message: `Created ${safeType.toLowerCase()} of ₹${numAmount.toLocaleString("en-IN")}`,
          transaction: createdTx,
        });
      } else if (action === "DELETE_TRANSACTION") {
        const txId = Number(payload.id);
        if (isNaN(txId) || txId <= 0) {
          return res.status(400).json({ error: "Valid transaction ID is required for deletion" });
        }

        // Strict record ownership check
        const existingTx = await prisma.transaction.findFirst({
          where: { id: txId, userId },
        });

        if (!existingTx) {
          throw new AppError("Transaction not found or unauthorized", 404);
        }

        await prisma.$transaction(async (tx: any) => {
          await tx.transaction.delete({
            where: { id: txId },
          });
        });

        return res.json({
          success: true,
          message: `Transaction #${txId} deleted successfully`,
        });
      } else {
        return res.status(400).json({ error: `Unsupported action '${action}'` });
      }
    } catch (err) {
      next(err);
    }
  },

  async transcribe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: "No audio file uploaded" });
      }

      let ext = "webm";
      const mime = req.file.mimetype || "";
      if (mime.includes("wav")) ext = "wav";
      else if (mime.includes("mp4") || mime.includes("m4a")) ext = "m4a";
      else if (mime.includes("ogg")) ext = "ogg";
      else if (req.file.originalname) {
        const parts = req.file.originalname.split(".");
        if (parts.length > 1) ext = parts[parts.length - 1];
      }

      const text = await transcribeAudioBuffer(req.file.buffer, ext);
      return res.json({ text });
    } catch (err) {
      next(err);
    }
  },
};