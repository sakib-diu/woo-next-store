import { z } from "zod";

// Define the schema for delivery information
export const deliverySchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  address_1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/District is required").optional(),
  postcode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  email: z
    .string()
    .email("Invalid email address")
    .max(100, "Email cannot exceed 100 characters"),
  phone: z
    .string()
    .regex(
      /^[0-9+\-\s]*$/,
      "Phone number can only contain digits, plus sign, spaces, or hyphens"
    )
    .min(7, "Phone number must be at least 7 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .optional()
    .or(z.literal("")),
});

// Define the schema for the entire form
export const checkoutFormSchema = z.object({
  delivery: deliverySchema,
  terms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
  couponCode: z.string().optional(),
});

export type FormValues = z.infer<typeof checkoutFormSchema>;

// Define the schema for the order data
// We still maintain the original structure for compatibility with the server action
export const orderDataSchema = z.object({
  billing: deliverySchema,
  shipping: deliverySchema,
  payment_method: z.literal("cod"),
});

export type OrderData = z.infer<typeof orderDataSchema>;

export const addressSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[A-Za-z\s\-']+$/, 'First name can only contain letters, spaces, hyphens, or apostrophes'),
  last_name: z
    .string()
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[A-Za-z\s\-']*$/, 'Last name can only contain letters, spaces, hyphens, or apostrophes')
    .optional(),
  address_1: z
    .string()
    .min(1, 'Address is required')
    .max(100, 'Address cannot exceed 100 characters'),
  address_2: z
    .string()
    .max(100, 'Address cannot exceed 100 characters')
    .optional(),
  city: z
    .string()
    .min(1, 'City is required')
    .max(50, 'City cannot exceed 50 characters')
    .regex(/^[A-Za-z\s\-]+$/, 'City can only contain letters, spaces, or hyphens'),
  state: z.string().optional(), // Validated dynamically based on country
  postcode: z
    .string()
    .min(3, 'Postcode must be at least 3 characters')
    .max(10, 'Postcode cannot exceed 10 characters')
    .regex(/^[A-Za-z0-9\s\-]+$/, 'Postcode can only contain letters, digits, spaces, or hyphens'),
  country: z.string().min(1, 'Country is required'),
  email: z
    .string()
    .email('Invalid email address')
    .max(100, 'Email cannot exceed 100 characters')
    .optional(),
  phone: z
    .string()
    .regex(/^[0-9+\-\s]*$/, 'Phone number can only contain digits, plus sign, spaces, or hyphens')
    .min(7, 'Phone number must be at least 7 digits')
    .max(15, 'Phone number cannot exceed 15 digits')
    .optional()
    .or(z.literal('')),
}).superRefine((data, ctx) => {
  // Validate state if country has states
  if (data.country && !data.state) {
    // This requires country/state data to check if states are available
    // Handled in component logic
  }
});

export type AddressFormValues = z.infer<typeof addressSchema>;

export const personalInfoSchema = z.object({
  first_name: z
    .string()
    .max(50, "First name cannot exceed 50 characters")
    .regex(
      /^[A-Za-z\s\-']*$/,
      "First name can only contain letters, spaces, hyphens, or apostrophes"
    ),
  last_name: z
    .string()
    .max(50, "Last name cannot exceed 50 characters")
    .regex(
      /^[A-Za-z\s\-']*$/,
      "Last name can only contain letters, spaces, hyphens, or apostrophes"
    )
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .max(100, "Email cannot exceed 100 characters"),
  // phone: z
  //   .string()
  //   .regex(
  //     /^[0-9+\-\s]*$/,
  //     "Phone number can only contain digits, plus sign, spaces, or hyphens"
  //   )
  //   .min(7, "Phone number must be at least 7 digits")
  //   .max(15, "Phone number cannot exceed 15 digits")
  //   .optional()
  //   .or(z.literal("")),
});

export const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .max(128, "Current password cannot exceed 128 characters")
      .regex(/^\S*$/, "Current password cannot contain spaces"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password cannot exceed 128 characters")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/^\S*$/, "Password cannot contain spaces"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;
export type PasswordFormValues = z.infer<typeof passwordSchema>;
