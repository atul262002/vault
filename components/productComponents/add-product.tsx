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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, Loader, Plus, X, FileText, ShieldCheck, MapPin, Clock, Search } from "lucide-react";
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

// ── Major Indian cities for search-as-you-type ─────────────────────────────
const INDIAN_CITIES = [
  "Agra", "Ahmedabad", "Ajmer", "Aligarh", "Allahabad", "Amritsar", "Aurangabad",
  "Bengaluru", "Bhopal", "Bhubaneswar", "Chandigarh", "Chennai", "Coimbatore",
  "Dehradun", "Delhi", "Dhanbad", "Durgapur", "Faridabad", "Ghaziabad",
  "Gurgaon", "Guwahati", "Gwalior", "Howrah", "Hyderabad", "Indore",
  "Jabalpur", "Jaipur", "Jalandhar", "Jammu", "Jodhpur", "Kanpur",
  "Kochi", "Kolkata", "Kozhikode", "Lucknow", "Ludhiana", "Madurai",
  "Mangalore", "Meerut", "Mumbai", "Mysuru", "Nagpur", "Nashik",
  "Navi Mumbai", "Noida", "Patna", "Pune", "Raipur", "Rajkot",
  "Ranchi", "Srinagar", "Surat", "Thane", "Thiruvananthapuram", "Tiruchirappalli",
  "Udaipur", "Vadodara", "Varanasi", "Vijayawada", "Visakhapatnam",
];

// ── City Search Combobox ────────────────────────────────────────────────────
function CitySearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim().length === 0
    ? INDIAN_CITIES.slice(0, 10)
    : INDIAN_CITIES.filter((c) => c.toLowerCase().includes(query.toLowerCase())).slice(0, 10);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (city: string) => {
    setQuery(city);
    onChange(city);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          id="city-search-input"
          type="text"
          autoComplete="off"
          value={query}
          placeholder="Search city…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(""); // clear form value until a city is selected
            setOpen(true);
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border bg-popover shadow-md text-sm text-popover-foreground">
          {filtered.map((city) => (
            <li
              key={city}
              onMouseDown={() => select(city)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                city === value ? "bg-accent font-medium" : ""
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AddProduct() {
    const [loading, setLoading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [createdListingId, setCreatedListingId] = useState<string | null>(null);
    const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
    const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

    useEffect(() => {
        if (!createdListingId) return;
        const timer = setTimeout(() => setCreatedListingId(null), 15000);
        return () => clearTimeout(timer);
    }, [createdListingId]);

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
            estimatedTime: "",
            ticketQuantity: 1,
            ticketPartner: ""
        },
    });

    async function onSubmit(values: z.infer<typeof addProductSchema>) {
        try {
            setLoading(true);
            const response = await axios.post("/api/product/add-product", values);
            const productId = response.data?.result?.id;
            const listingId = response.data?.result?.listingId;
            console.log()
            if (response.status === 200 && productId) {
                toast("Listing created successfully.", {
                    description: listingId || productId,
                    duration: 15000,
                    action: {
                        label: "Copy",
                        onClick: () => {
                            navigator.clipboard.writeText(listingId || productId);
                            toast.success("Listing ID copied.");
                        }
                    }
                });
                setCreatedListingId(listingId || productId);
                form.reset();
                setUploadProgress(0);
                setIsUploading(false);
                setIsOpen(false);
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
        <>
            {createdListingId ? (
                <div className="fixed top-4 right-4 z-[110] w-[320px] rounded-xl border bg-card p-4 text-card-foreground shadow-xl">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
                            <div>
                                <p className="text-sm font-semibold">Listing created</p>
                                <p className="mt-1 break-all rounded-md bg-muted text-muted-foreground px-2 py-1 font-mono text-xs">{createdListingId}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Visible for 15 seconds</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:bg-muted text-muted-foreground"
                            onClick={() => setCreatedListingId(null)}
                            aria-label="Close listing id banner"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                navigator.clipboard.writeText(createdListingId);
                                toast.success("Listing ID copied.");
                            }}
                        >
                            <Copy className="mr-2 h-3 w-3" />
                            Copy ID
                        </Button>
                    </div>
                </div>
            ) : null}
            {/* Seller Terms & Conditions Modal */}
            <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
                <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            Seller Terms &amp; Conditions
                        </DialogTitle>
                        <DialogDescription>
                            Please read and accept the Seller Terms &amp; Conditions before listing a ticket.
                        </DialogDescription>
                    </DialogHeader>

                    {/* PDF Viewer */}
                    <div className="flex-1 overflow-hidden rounded-md border border-border bg-muted" style={{ minHeight: "400px" }}>
                        <iframe
                            src="/Vault_Seller_Terms_and_Conditions.pdf"
                            className="w-full h-full"
                            style={{ minHeight: "400px" }}
                            title="Seller Terms and Conditions"
                        />
                    </div>

                    {/* Acceptance checkbox */}
                    <div className="mt-4 flex items-start gap-3 rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-3">
                        <input
                            id="seller-terms-checkbox"
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="mt-0.5 h-4 w-4 cursor-pointer accent-blue-600"
                        />
                        <label htmlFor="seller-terms-checkbox" className="text-sm text-blue-900 dark:text-blue-100 cursor-pointer select-none">
                            I have read and agree to Vault&apos;s <strong>Seller Terms &amp; Conditions</strong>. I understand that I must follow all listed rules, including providing accurate ticket details and completing transfers on time.
                        </label>
                    </div>

                    <div className="mt-4 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowTermsModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={!termsAccepted}
                            onClick={() => {
                                setShowTermsModal(false);
                                setIsOpen(true);
                            }}
                            className="gap-2"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Accept &amp; Continue
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setTermsAccepted(false); }}>
                <DialogTrigger asChild>
                    <Button
                        variant="default"
                        className="mr-5 p-2 font-normal w-full md:w-auto"
                        size={"icon"}
                        onClick={(e) => {
                            e.preventDefault();
                            setTermsAccepted(false);
                            setShowTermsModal(true);
                        }}
                    >
                        <Plus className="mr-2 md:mr-0" />
                        <span className="sr-only md:not-sr-only md:inline">
                            Add Listing
                        </span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] w-full max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add Ticket Listing</DialogTitle>
                    <DialogDescription>Fill in the event details below.</DialogDescription>
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-2 mb-4 text-sm" role="alert">
                        <p className="font-bold">Important:</p>
                        <p>Multiple ticket transfers are prohibited by some apps – please check the availability of your transfer option before uploading.</p>
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto flex-1 pr-2">
                    <FormProvider {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                            <FormField
                                control={form.control}
                                name="imageUrl"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Poster / Image Upload</FormLabel>
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
                                        <FormLabel>Or Enter Poster URL</FormLabel>
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
                                        <FormLabel>Event Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter event name" {...field} />
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
                                        <FormLabel>Price Per Ticket</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="Enter ticket price"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <div className="mt-2 p-2 bg-muted rounded-md border text-sm">
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
                                                    <div className="flex justify-between font-medium text-green-600 dark:text-green-400 mt-1 border-t border-dashed pt-1">
                                                        <span>You receive per ticket:</span>
                                                        <span>₹{(field.value - (field.value * 0.025)).toFixed(2)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Event Time + Date — side by side */}
                            <div className="grid grid-cols-2 gap-4">

                            {/* Event Time */}
                            <FormField
                                control={form.control}
                                name="refundPeriod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" /> Event Time
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="time"
                                                {...field}
                                            />
                                        </FormControl>
                                        {field.value && (
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(`1970-01-01T${field.value}`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Event Date */}
                            <FormField
                                control={form.control}
                                name="estimatedTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Event Date</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                min={new Date().toISOString().split('T')[0]}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            </div>{/* end date+time grid */}

                            {/* Qty + Ticket Partner — side by side */}
                            <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="ticketQuantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>No. of Tickets</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={1}
                                                placeholder="e.g., 2"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ticketPartner"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ticket Partner</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select partner" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="BookMyShow">BookMyShow</SelectItem>
                                                    <SelectItem value="District">District</SelectItem>
                                                    <SelectItem value="Insider">Insider</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            </div>{/* end qty+partner grid */}

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Event Details</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Describe seat, section, transfer notes, or event details" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" /> Event Location
                                        </FormLabel>
                                        <FormControl>
                                            <CitySearchInput
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">Start typing to search 60+ Indian cities</p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={loading || isUploading}>
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
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4" />
                                        Add Listing
                                    </span>
                                )}
                            </Button>
                        </form>
                    </FormProvider>
                </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
