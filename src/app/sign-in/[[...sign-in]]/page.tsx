"use client";

import { SignIn } from "@clerk/nextjs";

import Container from "@/components/Container";

export default function Page() {
  return (
    <Container className="flex justify-center">
      <SignIn />
    </Container>
  );
}