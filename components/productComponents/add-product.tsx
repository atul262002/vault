// "use client";
// import { Button } from "@/components/ui/button";
// import {
//     Dialog,
//     DialogContent,
//     DialogDescription,
//     DialogHeader,
//     DialogTitle,
//     DialogTrigger,
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
//     FormField,
//     FormItem,
//     FormLabel,
//     FormControl,
//     FormMessage,
// } from "@/components/ui/form";
// import ImageUpload from "./image-upload";
// import axios from "axios";

// export function AddProduct() {
//     const [loading, setLoading] = useState<boolean>(false);
//     const form = useForm<z.infer<typeof addProductSchema>>({
//         resolver: zodResolver(addProductSchema),
//         defaultValues: {
//             imageUrl: "",
//             image: "",
//             name: "",
//             price: 0,
//             refundPeriod: "",
//             description: "",
//             category: "",
//             estimatedTime: ""
//         },
//     });

//     async function onSubmit(values: z.infer<typeof addProductSchema>) {
//         try {
//             setLoading(true);
//             const response = await axios.post("/api/product/add-product", values);
//             const productId = response.data?.result?.id;
//             console.log()
//             if (response.status === 200 && productId) {
//                 toast("✅ Product has been created.", {
//                     description: productId,
//                     action: {
//                         label: "Copy",
//                         onClick: () => {
//                             navigator.clipboard.writeText(productId);
//                             toast.success("✅ Copied Product Id.");
//                         }
//                     }
//                 });
//             } else {
//                 toast.error("Product created, but ID not found in response.");
//                 console.error("Unexpected response data:", response.data);
//             }
//         } catch (error) {
//             console.error(error);
//             toast.error("Failed to add product.", {
//                 description: "An error occurred while creating the product.",
//             });
//         } finally {
//             setLoading(false);
//         }
//     }

//     return (
//         <Dialog>
//             <DialogTrigger asChild>
//                 <Button variant="default" className="mr-5 p-2 font-normal w-full md:w-auto" size={"icon"}>
//                     <Plus className="mr-2 md:mr-0" />
//                     <span className="sr-only md:not-sr-only md:inline">
//                         Add Product
//                     </span>
//                 </Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-[425px] w-full">
//                 <DialogHeader>
//                     <DialogTitle>Add New Product</DialogTitle>
//                     <DialogDescription>Fill in the product details below.</DialogDescription>
//                 </DialogHeader>

//                 <FormProvider {...form}>

//                     <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
//                         <FormField
//                             control={form.control}
//                             name="imageUrl"
//                             render={({ field }) => (
//                                 <FormItem className="col-span-2"> 
//                                     <FormLabel>Image Upload</FormLabel>
//                                     <FormControl>
//                                         <ImageUpload
//                                             value={field.value ?? ""}
//                                             onChange={(url) => field.onChange(url)}
//                                         />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <FormField
//                             control={form.control}
//                             name="imageUrl"
//                             render={({ field }) => (
//                                 <FormItem className="col-span-2">
//                                     <FormLabel>Image Upload</FormLabel>
//                                     <FormControl>
//                                         <Input placeholder="Image url" {...field} />
//                                     </FormControl>
//                                     <FormMessage />
//                                     {/* {field.value && (
//                                         <div className="mt-2 flex justify-center">
//                                             <img
//                                                 src={field.value}
//                                                 alt="Image Preview"
//                                                 className="max-h-48 max-w-full rounded-md object-contain border border-gray-300"
//                                                 onError={(e) => {
//                                                     (e.target as HTMLImageElement).style.display = 'none';
//                                                 }}
//                                                 onLoad={(e) => {
//                                                     (e.target as HTMLImageElement).style.display = 'block';
//                                                 }}
//                                             />
//                                         </div>
//                                     )} */}
//                                 </FormItem>
//                             )}
//                         />

//                         <FormField
//                             control={form.control}
//                             name="name"
//                             render={({ field }) => (
//                                 <FormItem> {/* Default col-span-1 */}
//                                     <FormLabel>Product Name</FormLabel>
//                                     <FormControl>
//                                         <Input placeholder="Enter product name" {...field} />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <FormField
//                             control={form.control}
//                             name="price"
//                             render={({ field }) => (
//                                 <FormItem> {/* Default col-span-1 */}
//                                     <FormLabel>Price</FormLabel>
//                                     <FormControl>
//                                         <Input
//                                             type="number"
//                                             placeholder="Enter price"
//                                             {...field}
//                                             onChange={(e) => field.onChange(Number(e.target.value))}
//                                         />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <FormField
//                             control={form.control}
//                             name="refundPeriod"
//                             render={({ field }) => (
//                                 <FormItem> {/* Default col-span-1 */}
//                                     <FormLabel>Refund Period</FormLabel>
//                                     <FormControl>
//                                         <Input
//                                             type="text"
//                                             placeholder="e.g., 30 Days"
//                                             {...field}
//                                         />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <FormField
//                             control={form.control}
//                             name="estimatedTime"
//                             render={({ field }) => (
//                                 <FormItem> {/* Default col-span-1 */}
//                                     <FormLabel>Estimated Delivery Time</FormLabel>
//                                     <FormControl>
//                                         <Input
//                                             type="text"
//                                             placeholder="e.g., 3-5 Business Days"
//                                             {...field}
//                                         />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <FormField
//                             control={form.control}
//                             name="description"
//                             render={({ field }) => (
//                                 <FormItem className="col-span-2"> {/* This now always spans 2 columns */}
//                                     <FormLabel>Description</FormLabel>
//                                     <FormControl>
//                                         <Input placeholder="Enter product description" {...field} />
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <FormField
//                             control={form.control}
//                             name="category"
//                             render={({ field }) => (
//                                 <FormItem className="col-span-2"> {/* This now always spans 2 columns */}
//                                     <FormLabel>Category</FormLabel>
//                                     <FormControl>
//                                         <Select onValueChange={field.onChange} defaultValue={field.value}>
//                                             <SelectTrigger className="w-full">
//                                                 <SelectValue placeholder="Select category" />
//                                             </SelectTrigger>
//                                             <SelectContent>
//                                                 <SelectItem value="Electronics">Electronics</SelectItem>
//                                                 <SelectItem value="Fashion">Apparel & Footwear</SelectItem>
//                                                 <SelectItem value="Kitchen">Home & Essentials</SelectItem>
//                                                 <SelectItem value="Beauty">Beauty & Personal Care</SelectItem>
//                                                 <SelectItem value="Health">Toys & Collectibles</SelectItem>
//                                                 <SelectItem value="Stationary">Luxury Items (more than ₹1,00,000)</SelectItem>
//                                                 <SelectItem value="Automotive">Automotive</SelectItem>
//                                                 <SelectItem value="Sports">Sports</SelectItem>
//                                                 <SelectItem value="PetSupplies">Others</SelectItem>
//                                             </SelectContent>
//                                         </Select>
//                                     </FormControl>
//                                     <FormMessage />
//                                 </FormItem>
//                             )}
//                         />

//                         <Button type="submit" className="w-full col-span-2" disabled={loading}> {/* This now always spans 2 columns */}
//                             {loading ? (
//                                 <span className="flex items-center justify-center">
//                                     <Loader className="w-4 h-4 animate-spin mr-2" />
//                                     Validating fields...
//                                 </span>
//                             ) : (
//                                 <span>Add</span>
//                             )}
//                         </Button>
//                     </form>
//                 </FormProvider>
//             </DialogContent>
//         </Dialog>
//     );
// }


"use client";
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
import { addProductSchema } from "@/schemas/add-product";
import { useState } from "react";
import { toast } from "sonner";
import { Loader, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import ImageUpload from "./image-upload";
import axios from "axios";
import { Progress } from "@/components/ui/progress";

export function AddProduct() {
    const [loading, setLoading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    const form = useForm<z.infer<typeof addProductSchema>>({
        resolver: zodResolver(addProductSchema),
        defaultValues: {
            imageUrl: "",
            image: "",
            name: "",
            price: 0,
            refundPeriod: "",
            description: "",
            category: "",
            estimatedTime: ""
        },
    });

    async function onSubmit(values: z.infer<typeof addProductSchema>) {
        try {
            setLoading(true);
            const response = await axios.post("/api/product/add-product", values);
            const productId = response.data?.result?.id;
            console.log()
            if (response.status === 200 && productId) {
                toast("✅ Product has been created.", {
                    description: productId,
                    action: {
                        label: "Copy",
                        onClick: () => {
                            navigator.clipboard.writeText(productId);
                            toast.success("✅ Copied Product Id.");
                        }
                    }
                });
            } else {
                toast.error("Product created, but ID not found in response.");
                console.error("Unexpected response data:", response.data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to add product.", {
                description: "An error occurred while creating the product.",
            });
        } finally {
            setLoading(false);
        }
    }

    const handleImageUpload = (url: string) => {
        form.setValue("imageUrl", url);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="default" className="mr-5 p-2 font-normal w-full md:w-auto" size={"icon"}>
                    <Plus className="mr-2 md:mr-0" />
                    <span className="sr-only md:not-sr-only md:inline">
                        Add Product
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] w-full max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>Fill in the product details below.</DialogDescription>
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-2 mb-4 text-sm" role="alert">
                        <p className="font-bold">Important:</p>
                        <p>Multiple ticket transfers are prohibited by some apps – please check the availability of your transfer option before uploading.</p>
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto flex-1 pr-2">
                    <FormProvider {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="imageUrl"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Image Upload</FormLabel>
                                        <FormControl>
                                            <ImageUpload
                                                value={field.value ?? ""}
                                                onChange={handleImageUpload}
                                                onUploadStart={() => {
                                                    setIsUploading(true);
                                                    setUploadProgress(0);
                                                }}
                                                onUploadProgress={(progress) => setUploadProgress(progress)}
                                                onUploadComplete={() => {
                                                    setIsUploading(false);
                                                    setUploadProgress(100);
                                                }}
                                            />
                                        </FormControl>
                                        {isUploading && (
                                            <div className="mt-2 space-y-2">
                                                <Progress value={uploadProgress} className="w-full" />
                                                <p className="text-xs text-muted-foreground text-center">
                                                    Uploading... {uploadProgress}%
                                                </p>
                                            </div>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="imageUrl"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Or Enter Image URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Image url" {...field} disabled={isUploading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Product Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter product name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="Enter price"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <div className="mt-2 p-2 bg-slate-50 rounded-md border text-sm">
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>Platform Fee:</span>
                                                <span>2.5%</span>
                                            </div>
                                            {field.value > 0 && (
                                                <>
                                                    <div className="flex justify-between text-muted-foreground mt-1 border-t pt-1">
                                                        <span>Fee Amount:</span>
                                                        <span>₹{(field.value * 0.025).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between font-medium text-green-600 mt-1 border-t border-dashed pt-1">
                                                        <span>You receive:</span>
                                                        <span>₹{(field.value - (field.value * 0.025)).toFixed(2)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="refundPeriod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Refund Period</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="e.g., 30 Days"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="estimatedTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estimated Delivery Time</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="e.g., 3-5 Business Days"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter product description" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Category</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Electronics">Electronics</SelectItem>
                                                    <SelectItem value="Fashion">Apparel & Footwear</SelectItem>
                                                    <SelectItem value="Kitchen">Home & Essentials</SelectItem>
                                                    <SelectItem value="Beauty">Beauty & Personal Care</SelectItem>
                                                    <SelectItem value="Health">Toys & Collectibles</SelectItem>
                                                    <SelectItem value="Stationary">Luxury Items (more than ₹1,00,000)</SelectItem>
                                                    <SelectItem value="Automotive">Automotive</SelectItem>
                                                    <SelectItem value="Sports">Sports</SelectItem>
                                                    <SelectItem value="PetSupplies">Others</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full col-span-2" disabled={loading || isUploading}>
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <Loader className="w-4 h-4 animate-spin mr-2" />
                                        Validating fields...
                                    </span>
                                ) : isUploading ? (
                                    <span className="flex items-center justify-center">
                                        <Loader className="w-4 h-4 animate-spin mr-2" />
                                        Uploading image...
                                    </span>
                                ) : (
                                    <span>Add</span>
                                )}
                            </Button>
                        </form>
                    </FormProvider>
                </div>
            </DialogContent>
        </Dialog>
    );
}