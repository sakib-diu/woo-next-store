// import { Customer } from "@/types/woocommerce";
// import { Button } from "../ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
// import { Input } from "../ui/input";
// import { Label } from "../ui/label";
// import { userData } from "./profile-page";

// interface AccountDetailsProps {
//     customer: Customer,
// }

// export function AccountDetails({ customer }: AccountDetailsProps) {
//     return (
//         <div className="space-y-6">
//             <div>
//                 <h2 className="text-2xl font-bold">Account Details</h2>
//                 <p className="text-muted-foreground">Update your account information</p>
//             </div>

//             <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
//                 <Card>
//                     <CardHeader>
//                         <CardTitle>Personal Information</CardTitle>
//                         <CardDescription>Update your personal details</CardDescription>
//                     </CardHeader>
//                     <CardContent className="space-y-4">
//                         <div className="space-y-2">
//                             <Label htmlFor="first_name">First Name</Label>
//                             <Input id="first_name" defaultValue={customer.first_name} />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="last_name">Last Name</Label>
//                             <Input id="first_name" defaultValue={customer.last_name} />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="email">Email</Label>
//                             <Input id="email" type="email" defaultValue={customer.email} />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="phone">Phone</Label>
//                             <Input id="phone" type="text" defaultValue={customer.phone} />
//                         </div>
//                         <Button className="w-full sm:w-auto">Save Changes</Button>
//                     </CardContent>
//                 </Card>

//                 <Card>
//                     <CardHeader>
//                         <CardTitle>Change Password</CardTitle>
//                         <CardDescription>Update your password</CardDescription>
//                     </CardHeader>
//                     <CardContent className="space-y-4">
//                         <div className="space-y-2">
//                             <Label htmlFor="current-password">Current Password</Label>
//                             <Input id="current-password" type="password" />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="new-password">New Password</Label>
//                             <Input id="new-password" type="password" />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="confirm-password">Confirm New Password</Label>
//                             <Input id="confirm-password" type="password" />
//                         </div>
//                         <Button className="w-full sm:w-auto">Update Password</Button>
//                     </CardContent>
//                 </Card>
//             </div>
//         </div>
//     )
// }


'use client';

import { updateCustomerPersonalInfo } from '@/actions/customer-action';
import { useAuth } from '@/hooks/use-auth';
import { PasswordFormValues, passwordSchema, PersonalInfoFormValues, personalInfoSchema } from '@/lib/validation';
import { Customer } from '@/types/woocommerce';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';

interface AccountDetailsProps {
    customer: Customer;
}

export function AccountDetails({ customer }: AccountDetailsProps) {
    const [isSubmittingPersonal, setIsSubmittingPersonal] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const { isAuthenticated, user } = useAuth();

    // Personal Info Form
    const personalForm = useForm<PersonalInfoFormValues>({
        resolver: zodResolver(personalInfoSchema),
        defaultValues: {
            first_name: customer.first_name || '',
            last_name: customer.last_name || '',
            email: customer.email || '',
        },
    });

    // Password Form
    const passwordForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    // Handle Personal Info Submission
    const onPersonalSubmit = async (data: PersonalInfoFormValues) => {
        setIsSubmittingPersonal(true);
        try {
            const result = await updateCustomerPersonalInfo(user?.user_id!, data);
            if (result.success) {
                toast.success(result.message);
                personalForm.reset(data); // Keep form in sync
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmittingPersonal(false);
        }
    };

    // Handle Password Submission
    const onPasswordSubmit = async (data: PasswordFormValues) => {
        setIsSubmittingPassword(true);
        try {
            // const result = await updateCustomerPassword(customer.id, data.newPassword);
            // if (result.success) {
            //     toast.success(result.message);
            //     passwordForm.reset(); // Clear password fields
            // } else {
            //     toast.error(result.message);
            // }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Account Details</h2>
                <p className="text-muted-foreground">Update your account information</p>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Update your personal details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Form {...personalForm}>
                            <form onSubmit={personalForm.handleSubmit(onPersonalSubmit)} className="space-y-4">
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input id="username" className='bg-muted' disabled value={customer.username || ''} readOnly />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                <FormField
                                    control={personalForm.control}
                                    name="first_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input id="first_name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={personalForm.control}
                                    name="last_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input id="last_name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={personalForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input id="email" type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* <FormField
                                    control={personalForm.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input id="phone" type="text" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                /> */}
                                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingPersonal}>
                                    {isSubmittingPersonal ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card className='max-h-fit'>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>Update your password</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 ">
                        <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                <FormField
                                    control={passwordForm.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Current Password</FormLabel>
                                            <FormControl>
                                                <Input id="current-password" type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={passwordForm.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Password</FormLabel>
                                            <FormControl>
                                                <Input id="new-password" type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={passwordForm.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm New Password</FormLabel>
                                            <FormControl>
                                                <Input id="confirm-password" type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmittingPassword}>
                                    {isSubmittingPassword ? 'Updating...' : 'Update Password'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
