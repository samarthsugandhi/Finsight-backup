import { z } from "zod";

export const createTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be a positive number"),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    categoryId: z.number().int(),
    description: z.string().trim().max(255).optional(),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }).optional(),
    sourceAccount: z.string().trim().max(100).optional().nullable(),
    destinationAccount: z.string().trim().max(100).optional().nullable(),
    linkedTransactionId: z.number().int().positive().optional().nullable(),
  }),
});

export const listTransactionsSchema = z.object({
  query: z.object({
    period: z.string().optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
    categoryId: z.coerce.number().int().optional(),
  }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>["body"];

export const updateTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be a positive number").optional(),
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional(),
    categoryId: z.number().int().optional(),
    description: z.string().trim().max(255).optional().nullable(),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }).optional(),
    sourceAccount: z.string().trim().max(100).optional().nullable(),
    destinationAccount: z.string().trim().max(100).optional().nullable(),
    linkedTransactionId: z.number().int().positive().optional().nullable(),
  }),
});

export const linkTransferSchema = z.object({
  body: z
    .object({
      outgoingTransactionId: z.number().int().positive(),
      incomingTransactionId: z.number().int().positive(),
    })
    .refine((data) => data.outgoingTransactionId !== data.incomingTransactionId, {
      message: "Cannot link a transaction to itself",
      path: ["incomingTransactionId"],
    }),
});

export const unlinkTransferSchema = z.object({
  body: z.object({
    transactionId: z.number().int().positive(),
  }),
});

