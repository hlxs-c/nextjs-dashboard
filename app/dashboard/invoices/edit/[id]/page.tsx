import Form from "@/app/ui/invoices/edit-form";
import Breadcrumbs from "@/app/ui/invoices/breadcrumbs";
import { fetchInvoiceById, fetchCustomers } from "@/app/lib/data";

export default async function Page({ params }: { params: Promise<{ edit: string }>}) {
    const edidId = (await params).edit;

    const [invoice, customers] = await Promise.all([
        fetchInvoiceById(edidId),
        fetchCustomers()
    ]);

    return (
        <main>
            <Breadcrumbs 
                breadcrumbs={[
                    { label: 'Invoices', href: '/dashboard/invoices' },
                    { label: 'Edit', href: '/dashboard/invoices/[id]/edit', active: true }
                ]}
            />
            <Form invoice={invoice} customers={customers} />
        </main>
    );
}