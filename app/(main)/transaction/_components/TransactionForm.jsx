'use client'

import { createTransaction } from '@/actions/transaction'
import useFetch from '@/hooks/useFetch'
import { transactionSchema } from '@/lib/schema'
import { zodResolver } from '@hookform/resolvers/zod'
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Input } from '@/components/ui/input'
import CreateAccountDrawer from '@/components/CreateAccountDrawer'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const TransactionForm = ({ accounts, categories }) => {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        getValues,
        reset
    } = useForm({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: "EXPENSE",
            amount: "",
            description: "",
            date: new Date(),
            accountId: accounts.find((ac) => ac.isDefault)?.id,
            isRecurring: false,
        }
    });

    const {
        loading: transactionLoading,
        fn: createTransactionFn,
        data: transactionResult,
    } = useFetch(createTransaction);

    const onSubmit = (data) => {
        const formData = {
            ...data,
            amount: parseFloat(data.amount),
        };

        createTransactionFn(formData);
    }

    const editMode = false;

    const type = watch("type");
    const isRecurring = watch("isRecurring");
    const date = watch("date");

    const filteredCategories = categories.filter((c) => c.type === type);

    console.log(transactionResult);

    useEffect(() => {
        if (transactionResult?.success && !transactionLoading) {
            toast.success("Transaction created successfully");
            router.push(`/account/${transactionResult?.data.accountId}`);
        };
        reset();
    }, [transactionResult, transactionLoading, editMode])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        {/* AI Receipt Scanner */}

        <div className='space-y-2'>
            <label className="text-sm font-medium">Type</label>
            <Select
                onValueChange={(value) => setValue("type", value)}
                defaultValue={type}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
            </Select>
            {errors.type && (
                <p className="text-sm text-red-500">{errors.type.message}</p>
            )}
        </div>
        
        <div className='grid gap-6 md:grid-cols-2'>
            <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("amount")}
                />
                {errors.amount && (
                    <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Account</label>
                <Select
                    onValueChange={(value) => setValue("accountId", value)}
                    defaultValue={getValues("accountId")}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                                {account.name} (${parseFloat(account.balance).toFixed(2)})
                            </SelectItem>
                        ))}
                        <CreateAccountDrawer>
                            <Button
                                variant="ghost"
                                className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            >
                                Create Account
                            </Button>
                        </CreateAccountDrawer>
                    </SelectContent>
                </Select>
                {errors.accountId && (
                    <p className="text-sm text-red-500">{errors.accountId.message}</p>
                )}
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
                onValueChange={(value) => setValue("category", value)}
                defaultValue={getValues("category")}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                    {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                            {category.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {errors.category && (
                <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full pl-3 text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(date) => setValue("date", date)}
                        disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input placeholder="Enter description" {...register("description")} />
            {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
        </div>

        {isRecurring && (
            <div className="space-y-2">
                <label className="text-sm font-medium">Recurring Interval</label>
                <Select
                    onValueChange={(value) => setValue("recurringInterval", value)}
                    defaultValue={getValues("recurringInterval")}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                </Select>
                {errors.recurringInterval && (
                    <p className="text-sm text-red-500">
                        {errors.recurringInterval.message}
                    </p>
                )}
            </div>
        )}

        <div className="flex gap-4">
            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
            >
                Cancel
            </Button>
            <Button type="submit" className="w-full" disabled={transactionLoading}>
                {transactionLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editMode ? "Updating..." : "Creating..."}
                    </>
                ) : editMode ? (
                    "Update Transaction"
                ) : (
                    "Create Transaction"
                )}
            </Button>
        </div>    
    </form>
  )
}

export default TransactionForm