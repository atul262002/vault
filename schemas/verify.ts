// "use client"

// import {z} from "zod"

// export const VerifyAccount=z.object({
//     // adhar:z.string().min(12,{message:"Invalid adhar number"}).max(12,{message:"Invalid adhar number"}),
//     ifsc:z.string().min(3,{message:"Invalid ifsc code"}),
//     account_number:z.string().min(5,{message:"Invaild account number"}),
//     account_type:z.string().min(3,{message:"Invaild account type"}),
//     phoneNumber:z.string().min(10,{message:"Invalid phone number"}).max(10,{message:"Invalid phone number"})
// })


"use client"

import { z } from "zod"

export const VerifyAccount = z.discriminatedUnion("account_type", [
  // Bank Account Schema
  z.object({
    account_type: z.literal("bank_account"),
    phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits" }),
    account_number: z.string().min(9, { message: "Account number is required" }),
    ifsc: z.string().min(11, { message: "Valid IFSC code is required" }).max(11),
    name: z.string().min(2, { message: "Account holder name is required" }),
  }),
  // VPA/UPI Schema
  z.object({
    account_type: z.literal("vpa"),
    phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits" }),
    vpa_address: z.string().min(3, { message: "Valid UPI ID is required" }).regex(
      /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/,
      { message: "Invalid UPI ID format (e.g., username@upi)" }
    ),
  }),
]);