import { AccountLayout } from "@/components/account-layout";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ accountType?: string }>;
}) {
  const params = await searchParams;
  const initialRole =
    params.accountType === "CAPACITY_CANADA_ADMIN" ? "CAPACITY_CANADA_ADMIN" : "NONPROFIT_STAFF";

  return (
    <AccountLayout eyebrow="Welcome back" title="Your next step is closer than you think." description="Pick up where you left off and keep moving the work that matters forward.">
      <LoginForm initialRole={initialRole} />
    </AccountLayout>
  );
}
