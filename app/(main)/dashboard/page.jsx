import React from 'react'

const Dashboard = () => {
  return (
    <div className='space-y-8'>
        BudgeProgress
        DashboardOverview
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
                <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
                    <Plus className="h-10 w-10 mb-2" />
                    <p className="text-sm font-medium">Add New Account</p>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}

export default Dashboard