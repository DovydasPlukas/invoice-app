"use client";

import Container from "@/components/Container";
import {
  OrganizationSwitcher,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

const Header = () => {
  const { isSignedIn } = useAuth();
  
  return (
    <header className="mt-8 mb-12">
      <Container>
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <p className="font-bold">
              <Link href={isSignedIn ? "/dashboard" : "/"}>
                Invoicipedia
              </Link>
            </p>
            <span className="text-slate-300">/</span>
            {isSignedIn && (
              <span className="-ml-2">
                <OrganizationSwitcher afterCreateOrganizationUrl="/dashboard" />
              </span>
            )}
          </div>
          <div>
            {!isSignedIn && (
              <SignInButton />
            )}
            {isSignedIn && (
              <UserButton />
            )}
          </div>
        </div>
      </Container>
    </header>
  );
};

export default Header;