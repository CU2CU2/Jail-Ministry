"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Church {
  id: string;
  name: string;
  city: string;
}

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().min(10, "Enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    county: z.enum(["DOUGLAS", "SARPY", "BOTH"], { required_error: "Select a county" }),
    churchId: z.string().optional(),
    churchNameAlt: z.string().optional(),
    address: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [churches, setChurches] = useState<Church[]>([]);
  const [churchSelection, setChurchSelection] = useState<string>("");
  const [countyValue, setCountyValue] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/churches")
      .then((r) => r.json())
      .then(setChurches)
      .catch(console.error);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleChurchChange = (value: string) => {
    setChurchSelection(value);
    if (value === "other") {
      setValue("churchId", undefined);
    } else {
      setValue("churchId", value);
      setValue("churchNameAlt", undefined);
    }
  };

  const handleCountyChange = (value: string) => {
    setCountyValue(value);
    setValue("county", value as "DOUGLAS" | "SARPY" | "BOTH");
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setServerError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setServerError(json.error ?? "Something went wrong.");
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-green-700">Application Submitted!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Thank you for registering! Your application has been sent to the county coordinator for
            review. You will receive an email once your account is approved.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Volunteer Registration</CardTitle>
        <CardDescription>
          Register to volunteer with the jail ministry. Your application will be reviewed by a
          coordinator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" placeholder="Jane Smith" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input id="phone" type="tel" placeholder="(402) 555-0100" {...register("phone")} />
            {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* County */}
          <div className="space-y-2">
            <Label>County *</Label>
            <Select onValueChange={handleCountyChange} value={countyValue}>
              <SelectTrigger>
                <SelectValue placeholder="Which county will you serve?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DOUGLAS">Douglas County</SelectItem>
                <SelectItem value="SARPY">Sarpy County</SelectItem>
                <SelectItem value="BOTH">Both Counties</SelectItem>
              </SelectContent>
            </Select>
            {errors.county && <p className="text-xs text-red-600">{errors.county.message}</p>}
          </div>

          {/* Church */}
          <div className="space-y-2">
            <Label>Church / Sponsoring Congregation *</Label>
            <Select onValueChange={handleChurchChange} value={churchSelection}>
              <SelectTrigger>
                <SelectValue placeholder="Select your church" />
              </SelectTrigger>
              <SelectContent>
                {churches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.city}
                  </SelectItem>
                ))}
                <SelectItem value="other">My church isn&apos;t listed…</SelectItem>
              </SelectContent>
            </Select>

            {churchSelection === "other" && (
              <div className="space-y-1 pt-1">
                <Input
                  placeholder="Enter your church name"
                  {...register("churchNameAlt")}
                />
                {errors.churchNameAlt && (
                  <p className="text-xs text-red-600">{errors.churchNameAlt.message}</p>
                )}
              </div>
            )}

            {!churchSelection && (
              <p className="text-xs text-muted-foreground">
                This helps coordinators understand which congregation you&apos;re associated with.
              </p>
            )}
          </div>

          {/* Address (optional) */}
          <div className="space-y-2">
            <Label htmlFor="address">Home Address (optional)</Label>
            <Input id="address" placeholder="123 Main St, Omaha, NE 68102" {...register("address")} />
            <p className="text-xs text-muted-foreground">Used for background check purposes only.</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting…" : "Submit Application"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
