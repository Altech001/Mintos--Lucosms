import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Login - LUCO-SMS"
        description="Login to your LUCO-SMS account to manage your SMS communications effectively."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
