"use client";

import Form from "next/form";
import { type SyntheticEvent, useState } from "react";
import Container from "@/components/Container";
import SubmitButton from "@/components/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAction } from "@/app/actions";

export default function Home() {
  const [state, setState] = useState<"ready" | "pending">("ready");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    value: "",
    description: "",
  });

  const isFormValid =
    formData.name &&
    formData.email &&
    formData.value &&
    formData.description;

  async function handleOnSubmit(event: SyntheticEvent) {
    if (state === "pending") {
      event.preventDefault();
      return;
    }
    setState("pending");
  }

  return (
    <main className="h-full">
      <Container>
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-semibold">Sukurti sąskaitos faktūra</h1>
        </div>

        <p className="pb-4 text-slate-500">
          *Nežinau kokie reikalingi duomenys sąskaitos faktūrai, tai kol kas tokius prašau
        </p>

        <Form
          action={createAction}
          onSubmit={handleOnSubmit}
          className="grid gap-4 max-w-xs"
        >
          <div>
            <Label htmlFor="name" className="block font-semibold text-sm mb-2">
              Pavadinimas
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="email" className="block font-semibold text-sm mb-2">
              El. paštas
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="value" className="block font-semibold text-sm mb-2">
              Kaina
            </Label>
            <Input
              id="value"
              name="value"
              type="number"
              step="any"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: e.target.value })
              }
            />
          </div>

          <div>
            <Label
              htmlFor="description"
              className="block font-semibold text-sm mb-2"
            >
              Aprašymas
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div>
            <SubmitButton disabled={!isFormValid} />
          </div>
        </Form>
      </Container>
    </main>
  );
}