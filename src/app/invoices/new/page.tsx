"use client";

import Form from "next/form";
import { type SyntheticEvent, useState } from "react";
import Container from "@/components/Container";
import SubmitButton from "@/components/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAction } from "@/app/actions";

type CustomerType = "physical" | "legal";

export default function Home() {
  const [state, setState] = useState<"ready" | "pending">("ready");
  const [customerType, setCustomerType] = useState<CustomerType>("physical");

  const [formData, setFormData] = useState({
    customerType: "physical" as CustomerType,
    firstName: "",
    lastName: "",
    companyName: "",
    companyCode: "",
    email: "",
    phone: "",
    address: "",
    value: "",
    description: "",
  });

  const isFormValid = () => {
    if (!formData.email || !formData.value || !formData.description) {
      return false;
    }

    if (customerType === "physical") {
      return !!formData.firstName && !!formData.lastName;
    } else {
      return !!formData.companyName && !!formData.companyCode;
    }
  };

  async function handleOnSubmit(event: SyntheticEvent) {
    if (state === "pending") {
      event.preventDefault();
      return;
    }
    setState("pending");
  }

  const handleCustomerTypeChange = (newType: string) => {
    const type = newType as CustomerType;
    setCustomerType(type);
    setFormData((prev) => ({ ...prev, customerType: type }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    if (digitsOnly.length <= 12) {
      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
    }
  };

  return (
    <main className="h-full">
      <Container>
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-semibold">Sukurti sąskaitos faktūrą</h1>
        </div>

        <Form
          action={createAction}
          onSubmit={handleOnSubmit}
          className="grid gap-4 max-w-xs"
        >
          {/* Customer Type Selection */}
          <div>
            <Label htmlFor="customerType" className="block font-semibold text-sm mb-2">
              Kliento tipas
            </Label>

            <input type="hidden" name="customerType" value={customerType} />

            <Select value={customerType} onValueChange={handleCustomerTypeChange}>
              <SelectTrigger id="customerType">
                <SelectValue placeholder="Pasirinkite kliento tipą" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Fizinis asmuo</SelectItem>
                <SelectItem value="legal">Juridinis asmuo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Physical Person Fields */}
          {customerType === "physical" && (
            <>
              <div>
                <Label htmlFor="firstName" className="block font-semibold text-sm mb-2">
                  Vardas
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Jonas"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="lastName" className="block font-semibold text-sm mb-2">
                  Pavardė
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Varaitis"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          {/* Legal Entity Fields */}
          {customerType === "legal" && (
            <>
              <div>
                <Label htmlFor="companyName" className="block font-semibold text-sm mb-2">
                  Įmonės pavadinimas
                </Label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder="UAB Pavyzdinė Įmonė"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, companyName: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="companyCode" className="block font-semibold text-sm mb-2">
                  Įmonės kodas
                </Label>
                <Input
                  id="companyCode"
                  name="companyCode"
                  type="text"
                  placeholder="123456789"
                  value={formData.companyCode}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, companyCode: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          {/* Common Fields */}
          <div>
            <Label htmlFor="email" className="block font-semibold text-sm mb-2">
              El. paštas
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jonas@pavyzdys.lt"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>

          <div>
            <Label htmlFor="phone" className="block font-semibold text-sm mb-2">
              Telefonas <span className="text-xs text-gray-500">(nebūtina)</span>
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="370600123456"
              value={formData.phone}
              onChange={handlePhoneChange}
            />
          </div>

          <div>
            <Label htmlFor="address" className="block font-semibold text-sm mb-2">
              Adresas <span className="text-xs text-gray-500">(nebūtina)</span>
            </Label>
            <Input
              id="address"
              name="address"
              type="text"
              placeholder="Gedimino g. 1, Vilnius"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
            />
          </div>

          <div>
            <Label htmlFor="value" className="block font-semibold text-sm mb-2">
              Suma
            </Label>
            <Input
              id="value"
              name="value"
              type="number"
              step="any"
              placeholder="9.99"
              value={formData.value}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, value: e.target.value }))
              }
            />
          </div>

          <div>
            <Label
              htmlFor="description"
              className="block font-semibold text-sm mb-2"
            >
              Prekės/Paslaugos pavadinimas
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Interneto puslapio dizaino ir kūrimo paslaugos projektui x"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          <div>
            <SubmitButton disabled={!isFormValid()} />
          </div>
        </Form>
      </Container>
    </main>
  );
}