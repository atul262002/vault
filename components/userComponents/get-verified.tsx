// "use client"
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { useForm, FormProvider } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { addProductSchema } from "@/schemas/add-product";
// import { useState } from "react";
// import { toast } from "sonner";
// import { Loader, Plus } from "lucide-react";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import {
//   FormField,
//   FormItem,
//   FormLabel,
//   FormControl,
//   FormMessage,
// } from "@/components/ui/form";
// import axios from "axios"
// import { IconExclamationCircle } from "@tabler/icons-react";
// import { VerifyAccount } from "@/schemas/verify";
// import { useUserContext } from "@/contexts/userContext";
// import { useRouter } from "next/navigation";

// export function Verify() {
//   const router = useRouter()
//   const [loading, setLoading] = useState<boolean>(false);
//   const { updateVerification } = useUserContext()
//   const form = useForm<z.infer<typeof VerifyAccount>>({
//     resolver: zodResolver(VerifyAccount),
//     defaultValues: {
//       // adhar: "",
//       account_number: "",
//       account_type: "",
//       ifsc: "",
//       phoneNumber:""
//     },
//   });

//   async function onSubmit(values: z.infer<typeof VerifyAccount>) {
//     try {
//       setLoading(true);
//       await new Promise((res) => setTimeout(res, 3000))
//       // const response = await axios.post("/api/user/verify", values)
//       const response = await axios.post("/api/razorpay/fund-account", values)
//       if (response.status === 200) {
//         toast("✅ Verification completed");
//         updateVerification(true)
//         router.refresh()
//       }
//       console.log(values)
//     } catch (error) {
//       console.log(error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <Dialog>
//       <DialogTrigger asChild>
//         <Button variant="default" className="text-sm md:mr-5 ml-5 font-normal" size={"sm"}>
//           <IconExclamationCircle /> Get Verified
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="sm:max-w-[425px]">
//         <DialogHeader>
//           <DialogTitle>Verify your bank account</DialogTitle>
//           <DialogDescription>Fill in the account details below.</DialogDescription>
//         </DialogHeader>

//         <FormProvider {...form}>
//           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 ">

//             {/* <FormField
//               control={form.control}
//               name="adhar"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Adhar Number</FormLabel>
//                   <FormControl>
//                     <Input placeholder="Enter adhar number" {...field} />
//                   </FormControl>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             /> */}

//             <FormField
//               control={form.control}
//               name="phoneNumber"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Phone Number</FormLabel>
//                   <FormControl>
//                     <Input placeholder="Enter phone number" {...field} />
//                   </FormControl>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />

//             <FormField
//               control={form.control}
//               name="account_number"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Account Number</FormLabel>
//                   <FormControl>
//                     <Input placeholder="Enter account number" {...field} />
//                   </FormControl>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />

//             <FormField
//               control={form.control}
//               name="account_type"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Account Type</FormLabel>
//                   <Select onValueChange={field.onChange} defaultValue={field.value}>
//                     <FormControl>
//                       <SelectTrigger>
//                         <SelectValue placeholder="Select account type" />
//                       </SelectTrigger>
//                     </FormControl>
//                     <SelectContent>
//                       <SelectItem value="bank_account">Bank Account</SelectItem>
//                       <SelectItem value="vpa">UPI (VPA)</SelectItem>
//                       <SelectItem value="wallet">Wallet</SelectItem>
//                       <SelectItem value="card">Card</SelectItem>
//                     </SelectContent>
//                   </Select>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />

//             <FormField
//               control={form.control}
//               name="ifsc"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>IFSC code</FormLabel>
//                   <FormControl>
//                     <Input placeholder="Enter ifsc code" {...field} />
//                   </FormControl>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />

//             <Button type="submit" className="w-full">
//               {loading ? (
//                 <span className="flex items-center justify-center">
//                   <Loader className="w-3 h-3 animate-spin" />
//                   Validating fields...
//                 </span>
//               ) : (
//                 <span>Validate</span>
//               )}
//             </Button>
//           </form>
//         </FormProvider>
//       </DialogContent>
//     </Dialog>
//   );
// }




"use client"
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { VerifyAccount } from "@/schemas/verify";
import { useState } from "react";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import axios from "axios"
import { IconExclamationCircle } from "@tabler/icons-react";
import { useUserContext } from "@/contexts/userContext";
import { useRouter } from "next/navigation";

export function Verify() {
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(false);
  const [accountType, setAccountType] = useState<"bank_account" | "vpa">("bank_account");
  const { updateVerification } = useUserContext()
  
  const form = useForm<z.infer<typeof VerifyAccount>>({
    resolver: zodResolver(VerifyAccount),
    defaultValues: {
      account_type: "bank_account",
      phoneNumber: "",
      account_number: "",
      ifsc: "",
      name: "",
    },
  });

  const handleAccountTypeChange = (value: "bank_account" | "vpa") => {
    setAccountType(value);
    // Reset form with new account type
    if (value === "bank_account") {
      form.reset({
        account_type: "bank_account",
        phoneNumber: "",
        account_number: "",
        ifsc: "",
        name: "",
      });
    } else {
      form.reset({
        account_type: "vpa",
        phoneNumber: "",
        vpa_address: "",
      });
    }
  };

  async function onSubmit(values: z.infer<typeof VerifyAccount>) {
    try {
      setLoading(true);
      console.log("Submitting values:", values);
      const response = await axios.post("/api/razorpay/fund-account", values)
      
      if (response.status === 200) {
        toast("✅ Verification completed");
        updateVerification(true)
        router.refresh()
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      const errorMessage = error.response?.data?.message || "Verification failed";
      toast(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" className="text-sm md:mr-5 ml-5 font-normal" size={"sm"}>
          <IconExclamationCircle /> Get Verified
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Verify your account</DialogTitle>
          <DialogDescription>
            Choose your account type and fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Account Type Selection */}
            <FormField
              control={form.control}
              name="account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select 
                    onValueChange={(value: "bank_account" | "vpa") => {
                      field.onChange(value);
                      handleAccountTypeChange(value);
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bank_account">Bank Account</SelectItem>
                      <SelectItem value="vpa">UPI / VPA</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Number - Common for both */}
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bank Account Fields */}
            {accountType === "bank_account" && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account holder name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ifsc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IFSC Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter IFSC code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* UPI/VPA Fields */}
            {accountType === "vpa" && (
              <FormField
                control={form.control}
                name="vpa_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPI ID / VPA Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="username@upi (e.g., john@paytm)" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Validating...
                </span>
              ) : (
                <span>Validate & Verify</span>
              )}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}