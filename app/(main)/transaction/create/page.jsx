import React from 'react'
import TransactionForm from '../_components/TransactionForm'
import { defaultCategories } from '@/data/categories';
import { getUserAccounts } from '@/actions/dashboard';
import { getTransaction } from '@/actions/transaction';

const AddTransaction = async ({ searchParams }) => {
    const accounts = await getUserAccounts();
    const editId = searchParams?.edit;

    let initialData = null;
    if (editId) {
        const transaction = await getTransaction(editId);
        initialData = transaction;
    }

  return (
    <div className="max-w-3xl mx-auto px-5">
        <div className="flex justify-center md:justify-normal mb-8">
            <h1 className="text-5xl gradient-title ">{ editId ? "Edit" : "Add"} Transaction</h1>
        </div>
        <TransactionForm
            accounts={accounts}
            categories={defaultCategories}
            initialData={initialData}
            editMode={!!editId}
        />
    </div>
  )
}

export default AddTransaction