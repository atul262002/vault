"use client"
 
import { z } from "zod"
 
export const addProductSchema = z.object({
  name: z.string().min(2, {message:"Product name is required."}).max(50),
  imageUrl: z.string({message:"Product image is required."}).optional(),
  image: z.string().optional(),
  price: z.number().min(1, {message:"Price is required."}),
  refundPeriod: z.string().min(1, {message:"Refund period is required."}),
  description: z.string().min(5, {message:"Product description is requried atleast 4 characters."}).max(50),
  category: z.string().min(1,{message:"Select atleast 1"}),
  estimatedTime: z.string().min(1,{message:"Estimated time is necessary"})
})
