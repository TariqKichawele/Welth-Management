'use server';

import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { request } from "@arcjet/next";
import aj from "@/lib/arcjet";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const serializeAmount = (obj) => ({
    ...obj,
    amount: obj.amount.toNumber(),
});

export async function createTransaction(data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        // Arcjet to add rate limiting
        const req = await request();
        const decision = await aj.protect(req, {
            userId,
            requested: 1
        })

        if (decision.isDenied()) {
            if (decision.reason.isRateLimit()) {
                const { remaining, reset } = decision.reason;
                console.error({
                    code: "RATE_LIMIT_EXCEEDED",
                    details: {
                        remaining,
                        resetInSeconds: reset
                    }
                });

                throw new Error("Rate limit exceeded, please try again later.");
            }

            throw new Error("Request Blocked");
        }

        const user = await db.user.findUnique({
            where: { clerkUserId: userId },
        })
        if (!user) throw new Error("User not found");

        const account = await db.account.findUnique({
            where: { id: data.accountId, userId: user.id },
        });
        if (!account) throw new Error("Account not found");

        const balanceChange =
            data.type === "EXPENSE"
                ? -data.amount
                : data.amount;
        const newBalance = account.balance.toNumber() + balanceChange;

        const transaction = await db.$transaction(async (tx) => {
            const newTransaction = await tx.transaction.create({
                data: {
                    ...data,
                    userId: user.id,
                    nextRecurringDate: data.isRecurring && data.recurringInterval
                        ? calculateNextRecurringDate(data.date, data.recurringInterval)
                        : null,
                }
            });

            await tx.account.update({
                where: { id: account.id },
                data: { balance: newBalance },
            });

            return newTransaction;
        });

        revalidatePath("/dashboard");
        revalidatePath(`/account/${transaction.accountId}`);

        console.log(transaction)

        return { success: true, data: serializeAmount(transaction) };
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function scanReceipt(file) {
    try {
        const model = genAi.getGenerativeModel({ model: "gemini-1.5-flash"});

        const arrayBuffer = await file.arrayBuffer();
        const base64String = Buffer.from(arrayBuffer).toString("base64");

        const prompt = `
            Analyze this receipt image and extract the following information in JSON format:
            - Total amount (just the number)
            - Date (in ISO format)
            - Description or items purchased (brief summary)
            - Merchant/store name
            - Suggested category (one of: housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense )
            
            Only respond with valid JSON in this exact format:
            {
                "amount": number,
                "date": "ISO date string",
                "description": "string",
                "merchantName": "string",
                "category": "string"
            }

            If its not a valid receipt, return an empty object
        `;

        const res = await model.generateContent([
            {
                inlineData: {
                    data: base64String,
                    mimeType: file.type
                },
            },
            prompt
        ]);

        const response = res.response;
        const text = response.text();
        const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

        try {
            const data = JSON.parse(cleanedText);
            return {
                amount: parseFloat(data.amount),
                date: new Date(data.date),
                description: data.description,
                merchantName: data.merchantName,
                category: data.category
            };
        } catch (parseError) {
            console.error("Error parsing JSON:", parseError);
            throw new Error("Error parsing JSON");
        }
    } catch (error) {
        console.error("Error scanning receipt:", error);
        throw new Error("Error scanning receipt");
    }
}

export async function getTransaction(id) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
        where: { clerkUserId: userId },
    })
    if (!user) throw new Error("User not found");

    const transaction = await db.transaction.findUnique({
        where: { 
            id,
            userId: user.id, 
        },
    });

    if (!transaction) throw new Error("Transaction not found");

    return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: { clerkUserId: userId },
        })
        if (!user) throw new Error("User not found");

        const originalTransaction = await db.transaction.findUnique({
            where: { id, userId: user.id },
            incluse: { account: true },
        });
        if (!originalTransaction) throw new Error("Transaction not found");

        const oldBalanceChange = 
            originalTransaction.type === "EXPENSE"
                ? -originalTransaction.amount.toNumber()
                : originalTransaction.amount.toNumber();

        const newBalanceChange =
            data.type === "EXPENSE"
                ? -data.amount
                : data.amount;
            
        const netBalanceChange = newBalanceChange - oldBalanceChange;

        const transaction = await db.$transaction(async (tx) => {
            const updated = await tx.transaction.update({
                where: { id, userId: user.id },
                data: {
                    ...data,
                    nextRecurringDate: 
                        data.isRecurring && data.recurringInterval
                            ? calculateNextRecurringDate(data.date, data.recurringInterval)
                            : null,
                }
            });

            await tx.account.update({
                where: { id: data.accountId },
                data: {
                    balance: {
                        increment: netBalanceChange
                    }
                }
            });

            return updated;
        });

        revalidatePath("/dashboard");
        revalidatePath(`/account/${data.accountId}`);

        return { success: true, data: serializeAmount(transaction) };
    } catch (error) {
        throw new Error(error.message);
    }
}

export async function getUserTransactions(query = {}) {
    try {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");

        const user = await db.user.findUnique({
            where: { clerkUserId: userId },
        })
        if (!user) throw new Error("User not found");

        const transactions = await db.transaction.findMany({
            where: {
                userId: user.id,
                ...query,
            },
            include: {
                account: true,
            },
            orderBy: {
                date: "desc"
            }
        });

        return { success: true, data: transactions };
    } catch (error) {
        throw new Error(error.message);
    }
}

function calculateNextRecurringDate(startDate, interval) {
    const date = new Date(startDate);

    switch (interval) {
        case "DAILY":
            date.setDate(date.getDate() + 1);
            break;
        case "WEEKLY":
            date.setDate(date.getDate() + 7);
            break;
        case "MONTHLY":
            date.setMonth(date.getMonth() + 1);
            break;
        case "YEARLY":
            date.setFullYear(date.getFullYear() + 1);
            break;
    }

    return date;
}