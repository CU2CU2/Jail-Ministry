"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function VerifyEmailContent() {
  const params = useSearchParams();
  const verified = params.get("verified");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        {verified ? (
          <>
            <h1 className="text-2xl font-bold text-green-700 mb-2">Email Verified!</h1>
            <p className="text-gray-600 mb-4">Your email has been verified. You can now log in.</p>
            <Link href="/login" className="text-blue-600 underline">Go to Login</Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
            <p className="text-gray-600">
              We sent a verification link to your email address. Please check your inbox and click the link to verify your account.
            </p>
            <p className="text-sm text-gray-500 mt-4">The link expires in 24 hours.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
