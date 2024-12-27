import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { checkBudgetAlerts, generateMonthlyReport, processRecurringTransaction, triggerRecurringTransactions } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        checkBudgetAlerts,
        triggerRecurringTransactions,
        processRecurringTransaction,
        generateMonthlyReport
    ]
})