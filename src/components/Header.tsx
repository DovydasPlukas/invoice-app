"use client";

import Container from "@/components/Container";
import {
  OrganizationSwitcher,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { LogIn } from 'lucide-react';

const Header = () => {
  const { isSignedIn } = useAuth();
  
  return (
    <header className="mt-8 mb-12">
      <Container>
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <p className="transition-all duration-300 hover:scale-105 font-bold">
              <Link href={isSignedIn ? "/dashboard" : "/"}>
                Sąskaitos faktūra
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
              <SignInButton>
                <LogIn className="transition-all duration-300 hover:scale-105 cursor-pointer" />
              </SignInButton>
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