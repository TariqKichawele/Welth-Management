import { sendEmail } from "@/actions/sendEmail";
import { db } from "../prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";

export const checkBudgetAlerts = inngest.createFunction(
    { name: "Check Budget Alerts" },
    { cron: "0 */6 * * *" },
    async ({ step }) => {
        const budgets = await step.run("fetch-budget", async () => {
            return await db.budget.findMany({
                include: {
                    user: {
                        include: {
                            accounts: {
                                where: {
                                    isDefault: true
                                }
                            }
                        }
                    }
                }
            })
        });

        for (const budget of budgets) {
            const defaultAccount = budget.user.accounts[0];
            if (!defaultAccount) continue;

            await step.run(`check-budget-${budget.id}`, async () => {
                const startDate = new Date();
                startDate.setDate(1); // Set the start date to the first day of the current month

                // Get the total amount of expenses for default account
                const expenses = await db.transaction.aggregate({
                    where: {
                        userId: budget.user.id,
                        accountId: defaultAccount.id,
                        type: "EXPENSE",
                        date: {
                            gte: startDate
                        }
                    },
                    _sum: {
                        amount: true
                    }
                });

                const totalExpenses = expenses._sum.amount?.toNumber() || 0;
                const budgetAmount = budget.amount;
                const percentageUsed = (totalExpenses / budgetAmount) * 100;

                if (
                    percentageUsed >= 80 && 
                    (!budget.lastAlertSent||
                        isNewMonth(new Date(budget.lastAlertSent), new Date()))
                    ) {

                        // Send Email
                        await sendEmail({
                            to: budget.user.email,
                            subject: `Budget Alert for ${defaultAccount.name}`,
                            react: EmailTemplate({
                                userName: budget.user.name,
                                type: "budget-alert",
                                data: {
                                    percentageUsed,
                                    budgetAmount: parseInt(budgetAmount).toFixed(1),
                                    totalExpenses: parseInt(totalExpenses).toFixed(1),
                                    accountName: defaultAccount.name
                                }
                            })
                        });

                        // update lastAlertSent
                        await db.budget.update({
                            where: { id: budget.id },
                            data: { lastAlertSent: new Date() }
                        })
                    }
            })
        }
    }

)

export const triggerRecurringTransactions = inngest.createFunction(
    { id: "trigger-recurring-transactions", name: "Trigger Recurring Transactions" }, 
    { cron: "0 0 * * *" },
    async ({ step }) => {
        const recurringTransactions = await step.run("fetch-recurring-transactions", async () => {
            return await db.transaction.findMany({
                where: {
                    isRecurring: true,
                    status: "COMPLETED",
                    OR: [
                        { lastProcessed: null }, // Transactions that haven't been processed yet
                        { nextRecurringDate: { lt: new Date() } } // Due date is in the past
                    ]
                }
            })
        });

        if (recurringTransactions.length > 0) {
            const events = recurringTransactions.map((transaction) => ({
                name: 'transaction.recurring.process',
                data: {
                    transactionId: transaction.id,
                    userId: transaction.userId,
                }
            }));

            await inngest.send(events);
        }

        return { triggered: recurringTransactions.length }
    }
)

export const processRecurringTransaction = inngest.createFunction(
    {
        id: "process-recurring-transaction",
        name: "Process Recurring Transaction",
        throttle: {
            limit: 10,
            period: "1m",
            key: "event.data.userId"
        }
    },
    { event: "transaction.recurring.process" },
    async ({ event, step }) => {
        if (!event?.data?.transactionId || !event?.data?.userId) {
            console.error("Invalid event data:", event);
            return { error: "Invalid event data" };
        }

        await step.run("process-transaction", async () => {
            const transaction = await db.transaction.findUnique({
                where: {
                    id: event.data.transactionId,
                    userId: event.data.userId
                },
                include: {
                    account: true
                }
            });

            if (!transaction || !isTransactionDue(transaction)) return;

            await db.$transaction(async (tx) => {
                await tx.transaction.create({
                    data: {
                        type: transaction.type,
                        amount: transaction.amount,
                        description: `${transaction.description} (Recurring)`,
                        date: new Date(),
                        category: transaction.category,
                        userId: transaction.userId,
                        accountId: transaction.accountId,
                        isRecurring: false,
                    }
                });

                const balanceChange = 
                    transaction.type === "EXPENSE"
                        ? -transaction.amount.toNumber()
                        : transaction.amount.toNumber();

                await tx.account.update({
                    where: { id: transaction.accountId },
                    data: {
                        balance: { increment: balanceChange }
                    }
                });

                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        lastProcessed: new Date(),
                        nextRecurringDate: calculateNextRecurringDate(new Date(), transaction.recurringInterval)
                    }
                });
            })
        });
    }
)


function isTransactionDue(transaction) {
    if (!transaction.lastProcessed) return true;

    const today = new Date();
    const nextDue = new Date(transaction.nextRecurringDate);

    return nextDue <= today;
}

function calculateNextRecurringDate(date, interval) {
    const next = new Date(date);
    switch (interval) {
      case "DAILY":
        next.setDate(next.getDate() + 1);
        break;
      case "WEEKLY":
        next.setDate(next.getDate() + 7);
        break;
      case "MONTHLY":
        next.setMonth(next.getMonth() + 1);
        break;
      case "YEARLY":
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
}

function isNewMonth(lastAlertDate, currentDate) {
    return (
        lastAlertDate.getMonth() !== currentDate.getMonth() ||
        lastAlertDate.getFullYear() !== currentDate.getFullYear()
    )
}

