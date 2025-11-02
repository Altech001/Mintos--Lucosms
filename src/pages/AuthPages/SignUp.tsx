import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="SignUp - LUCO-SMS"
        description="Login to your LUCO-SMS account to manage your SMS communications effectively."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
