"use client"
 
import { z } from "zod"
 
export const addProductSchema = z.object({
  name: z.string().min(2, {message:"Event name is required."}).max(80),
  imageUrl: z.string().optional(),
  image: z.string().optional(),
  price: z.number().min(1, {message:"Price per ticket is required."}),
  refundPeriod: z.string().min(1, {message:"Event time is required."}),
  description: z.string().min(5, {message:"Event details are required."}).max(500),
  category: z.string().min(1,{message:"Event location is required."}),
  estimatedTime: z.string().min(1,{message:"Event date is required."}),
  ticketQuantity: z.number().int().min(1, { message: "Number of tickets is required." }),
  ticketPartner: z.string().min(1, { message: "Ticket partner is required." }).max(40),
})
