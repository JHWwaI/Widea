"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!user.userType && pathname !== "/select-type") {
      router.replace("/select-type");
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <div className="fade-up flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
          <span className="text-sm text-gray-500">워크스페이스를 준비하고 있습니다...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
