"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { GraduationCap, User, Mail, Lock, Sparkles, ArrowRight } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  targetClass: z.enum(["Class 11", "Class 12"]),
  targetGoal: z.enum(["JEE Main & Advanced", "NEET UG", "CBSE Board Top Ranker"]),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      targetClass: "Class 12",
      targetGoal: "JEE Main & Advanced",
    },
  });

  const selectedClass = watch("targetClass");

  const onSubmit = async (data: SignupFormValues) => {
    signup(data.name, data.email, "student", data.targetClass);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Top Banner */}
        <div className="bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 p-6 text-white text-center relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black">Create Free Account</h2>
          <p className="text-xs text-blue-100 mt-1">Start Learning Class 11 & 12 Batch Content</p>

          <div className="grid grid-cols-2 p-1 bg-white/15 backdrop-blur-md rounded-xl mt-6 border border-white/20">
            <Link
              href="/login"
              className="py-2 text-xs font-bold rounded-lg transition text-center text-white/80 hover:text-white"
            >
              Sign In
            </Link>
            <button
              type="button"
              className="py-2 text-xs font-bold rounded-lg transition bg-white text-blue-700 shadow-sm"
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  {...register("name")}
                  type="text"
                  placeholder="Rahul Sharma"
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition"
                />
              </div>
              {errors.name && <p className="text-[11px] font-medium text-red-500">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="rahul@example.com"
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition"
                />
              </div>
              {errors.email && <p className="text-[11px] font-medium text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition"
                />
              </div>
              {errors.password && <p className="text-[11px] font-medium text-red-500">{errors.password.message}</p>}
            </div>

            {/* Target Class Selection */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Select Target Class</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setValue("targetClass", "Class 11")}
                  className={`py-2 rounded-xl border text-xs font-bold transition ${
                    selectedClass === "Class 11"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Class 11th
                </button>
                <button
                  type="button"
                  onClick={() => setValue("targetClass", "Class 12")}
                  className={`py-2 rounded-xl border text-xs font-bold transition ${
                    selectedClass === "Class 12"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Class 12th
                </button>
              </div>
            </div>

            {/* Target Exam Goal */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Target Competitive Exam</label>
              <select
                {...register("targetGoal")}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="JEE Main & Advanced">JEE Main & Advanced (Engineering)</option>
                <option value="NEET UG">NEET UG (Medical)</option>
                <option value="CBSE Board Top Ranker">CBSE Board Exam Specialist</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition"
            >
              <span>Create Free Student Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
