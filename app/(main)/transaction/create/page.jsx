import React from 'react'
import TransactionForm from '../_components/TransactionForm'
import { defaultCategories } from '@/data/categories';
import { getUserAccounts } from '@/actions/dashboard';

const AddTransaction = async () => {
    const accounts = await getUserAccounts();

  return (
    <div className="max-w-3xl mx-auto px-5">
        <div className="flex justify-center md:justify-normal mb-8">
            <h1 className="text-5xl gradient-title ">Add Transaction</h1>
        </div>
        <TransactionForm
            accounts={accounts}
            categories={defaultCategories}
        />
    </div>
  )
}

export default AddTransaction