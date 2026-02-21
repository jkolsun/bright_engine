/**
 * Zod validation schemas for each onboarding form step.
 */

import { z } from 'zod'

export const step1Schema = z.object({
  companyName: z.string().min(1, 'Business name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
})

export const step2Schema = z.object({
  services: z.array(z.string()).min(1, 'At least one service is required'),
})

export const step3Schema = z.object({
  serviceArea: z.string().optional().or(z.literal('')),
})

export const step4Schema = z.object({
  aboutStory: z.string().min(10, 'Tell us a bit more about your business'),
})

export const step5Schema = z.object({
  differentiator: z.string().min(5, 'What makes you different from competitors?'),
})

export const step6Schema = z.object({
  yearsInBusiness: z.string().optional().or(z.literal('')),
  certifications: z.string().optional().or(z.literal('')),
})

export const step7Schema = z.object({
  testimonial: z.string().optional().or(z.literal('')),
  reviewerName: z.string().optional().or(z.literal('')),
})

export const step8Schema = z.object({
  logo: z.string().optional().or(z.literal('')),
})

export const step9Schema = z.object({
  photos: z.array(z.string()).optional(),
})

export const step10Schema = z.object({})

export const stepSchemas = [
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
  step8Schema,
  step9Schema,
  step10Schema,
]
