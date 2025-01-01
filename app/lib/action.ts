'use server'

import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from "@vercel/postgres";
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const client = await db.connect();

export type State = {
    error?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Customer ID must be a string',
    }),
    amount: z.coerce.number().gt(0, {message: 'Amount must be greater than $0'}),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Status must be either "pending" or "paid"',
    }),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({id: true, date: true});

export async function createInvoice(prevState: State,formData: FormData) {
    // Validate form fields using Zod
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status') ,
    });

    console.log(validatedFields);

    // If form validation fails, return errors early. Otherwise, continue.
    if(!validatedFields.success) {
        return {
            error: validatedFields.error.flatten().fieldErrors,
            message: null,
        };
    }

    // Prepare data for insertion into the database
    const { customerId, amount, status } = validatedFields.data;

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    /*
    await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    */
   
    try{
        await client.sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch(error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }
    

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({id: true, date: true})

export async function updateInvoice(id: string, formData: FormData) {
    const {customerId, amount, status} = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;

    try{
        await client.sql`
        UPDATE invoices
        SET customer_id = ${customerId},
            amount = ${amountInCents},
            status = ${status}
        WHERE id = ${id}
        `;
    } catch(error) {
        return {
            message: 'Database Error: Failed to Update Invoice.',
        };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    // throw new Error('Failed to Delete Invoice.');

    try{
        await client.sql`
        DELETE FROM invoices
        WHERE id = ${id}
        `;
        revalidatePath('/dashboard/invoices');
    } catch(error) {
        return {
            message: 'Database Error: Failed to Delete Invoice.',
        };
    }
    
    redirect('/dashboard/invoices');
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid email or password.';
                default:
                    return 'Failed to sign in.';
            }
        }
        throw error;
    }
}