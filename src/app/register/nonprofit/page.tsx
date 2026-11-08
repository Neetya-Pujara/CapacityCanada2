import { AccountLayout } from "@/components/account-layout";
import { RegistrationForm } from "@/components/registration-form";

export default function NonprofitRegistrationPage() {
  return (
    <AccountLayout eyebrow="For nonprofit people" title="Your mission deserves room to grow." description="We'll start by getting to know you, then learn a little about the organization behind your work.">
      <RegistrationForm />
    </AccountLayout>
  );
}
