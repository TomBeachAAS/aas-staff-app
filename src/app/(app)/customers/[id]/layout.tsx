import { CustomerTasks } from '@/components/customers/CustomerTasks';

export default function CustomerDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CustomerTasks />
    </>
  );
}
