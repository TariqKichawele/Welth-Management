import CreateAccountDrawer from '@/components/CreateAccountDrawer'
import React from 'react'
import { Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getUserAccounts } from '@/actions/dashboard'
import AccountCard from './_components/AccountCard'
import BudgetProgress from './_components/BudgetProgress'
import { getCurrentBudget } from '@/actions/budget'
import { getDashboardData } from '@/actions/dashboard'
import DashboardOverview from './_components/DashboardOverview'

const Dashboard = async () => {
    const [ accounts, transactions ] = await Promise.all([
        getUserAccounts(),
        getDashboardData()
    ])

    const defaultAccount = accounts.find((account) => account.isDefault);

    let budgetData = null;
    if (defaultAccount) {
        budgetData = await getCurrentBudget(defaultAccount.id);
    }

  return (
    <div className='space-y-8'>
        {defaultAccount && (
            <BudgetProgress 
                initialBudget={budgetData}
                currentExpenses={budgetData?.currentExpenses || 0}
            />
        )}

        <DashboardOverview 
            accounts={accounts}
            transactions={transactions || []}
        />

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            <CreateAccountDrawer>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
                    <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
                        <Plus className="h-10 w-10 mb-2" />
                        <p className="text-sm font-medium">Add New Account</p>
                    </CardContent>
                </Card>
            </CreateAccountDrawer>
            {accounts.length > 0 &&
                accounts?.map((account) => (
                    <AccountCard key={account.id} account={account} />
            ))}
        </div>
    </div>
  )
}

export default Dashboard