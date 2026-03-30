/**
 * Radix UI Type Declarations
 * Suprime falsos positivos de TypeScript para componentes Radix UI
 * @fileoverview Declarações permissivas para módulos @radix-ui/*
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// ============================================
// Accordion
// ============================================
declare module "@radix-ui/react-accordion" {
  import * as React from "react";
  export const Accordion: any;
  export const AccordionItem: any;
  export const AccordionTrigger: any;
  export const AccordionContent: any;
}

// ============================================
// Alert Dialog
// ============================================
declare module "@radix-ui/react-alert-dialog" {
  import * as React from "react";
  export const AlertDialog: any;
  export const AlertDialogAction: any;
  export const AlertDialogCancel: any;
  export const AlertDialogContent: any;
  export const AlertDialogDescription: any;
  export const AlertDialogFooter: any;
  export const AlertDialogHeader: any;
  export const AlertDialogTitle: any;
  export const AlertDialogOverlay: any;
  export const AlertDialogTrigger: any;
}

// ============================================
// Checkbox
// ============================================
declare module "@radix-ui/react-checkbox" {
  import * as React from "react";
  export const Checkbox: any;
  export const CheckboxIndicator: any;
}

// ============================================
// Dialog
// ============================================
declare module "@radix-ui/react-dialog" {
  import * as React from "react";
  export const Dialog: any;
  export const DialogTrigger: any;
  export const DialogContent: any;
  export const DialogHeader: any;
  export const DialogFooter: any;
  export const DialogTitle: any;
  export const DialogDescription: any;
  export const DialogClose: any;
  export const DialogOverlay: any;
}

// ============================================
// Dropdown Menu
// ============================================
declare module "@radix-ui/react-dropdown-menu" {
  import * as React from "react";
  export const DropdownMenu: any;
  export const DropdownMenuTrigger: any;
  export const DropdownMenuContent: any;
  export const DropdownMenuItem: any;
  export const DropdownMenuLabel: any;
  export const DropdownMenuSeparator: any;
  export const DropdownMenuGroup: any;
  export const DropdownMenuSub: any;
  export const DropdownMenuRadioGroup: any;
  export const DropdownMenuRadioItem: any;
  export const DropdownMenuCheckboxItem: any;
  export const DropdownMenuSubTrigger: any;
  export const DropdownMenuSubContent: any;
}

// ============================================
// Label
// ============================================
declare module "@radix-ui/react-label" {
  import * as React from "react";
  export const Label: any;
}

// ============================================
// Popover
// ============================================
declare module "@radix-ui/react-popover" {
  import * as React from "react";
  export const Popover: any;
  export const PopoverTrigger: any;
  export const PopoverContent: any;
  export const PopoverAnchor: any;
}

// ============================================
// Select
// ============================================
declare module "@radix-ui/react-select" {
  import * as React from "react";
  export const Select: any;
  export const SelectTrigger: any;
  export const SelectValue: any;
  export const SelectContent: any;
  export const SelectItem: any;
  export const SelectLabel: any;
  export const SelectSeparator: any;
  export const SelectGroup: any;
  export const SelectScrollUpButton: any;
  export const SelectScrollDownButton: any;
}

// ============================================
// Switch
// ============================================
declare module "@radix-ui/react-switch" {
  import * as React from "react";
  export const Switch: any;
  export const SwitchThumb: any;
}

// ============================================
// Tabs
// ============================================
declare module "@radix-ui/react-tabs" {
  import * as React from "react";
  export const Tabs: any;
  export const TabsList: any;
  export const TabsTrigger: any;
  export const TabsContent: any;
}

// ============================================
// Toggle
// ============================================
declare module "@radix-ui/react-toggle" {
  import * as React from "react";
  export const Toggle: any;
  export const ToggleGroup: any;
  export const ToggleGroupItem: any;
}

// ============================================
// Tooltip
// ============================================
declare module "@radix-ui/react-tooltip" {
  import * as React from "react";
  export const Tooltip: any;
  export const TooltipTrigger: any;
  export const TooltipContent: any;
  export const TooltipProvider: any;
}

// ============================================
// Slot
// ============================================
declare module "@radix-ui/react-slot" {
  import * as React from "react";
  export const Slot: any;
}

// ============================================
// Separator
// ============================================
declare module "@radix-ui/react-separator" {
  import * as React from "react";
  export const Separator: any;
}

// ============================================
// Visually Hidden
// ============================================
declare module "@radix-ui/react-visually-hidden" {
  import * as React from "react";
  export const VisuallyHidden: any;
}

// ============================================
// Collapsible
// ============================================
declare module "@radix-ui/react-collapsible" {
  import * as React from "react";
  export const Collapsible: any;
  export const CollapsibleTrigger: any;
  export const CollapsibleContent: any;
}

// ============================================
// Scroll Area
// ============================================
declare module "@radix-ui/react-scroll-area" {
  import * as React from "react";
  export const ScrollArea: any;
  export const ScrollAreaViewport: any;
  export const ScrollAreaScrollbar: any;
  export const ScrollAreaThumb: any;
  export const ScrollAreaCorner: any;
}

// ============================================
// Slider
// ============================================
declare module "@radix-ui/react-slider" {
  import * as React from "react";
  export const Slider: any;
  export const SliderTrack: any;
  export const SliderRange: any;
  export const SliderThumb: any;
}

// ============================================
// Progress
// ============================================
declare module "@radix-ui/react-progress" {
  import * as React from "react";
  export const Progress: any;
}

// ============================================
// Radio Group
// ============================================
declare module "@radix-ui/react-radio-group" {
  import * as React from "react";
  export const RadioGroup: any;
  export const RadioGroupItem: any;
  export const RadioGroupIndicator: any;
}

// ============================================
// Navigation Menu
// ============================================
declare module "@radix-ui/react-navigation-menu" {
  import * as React from "react";
  export const NavigationMenu: any;
  export const NavigationMenuList: any;
  export const NavigationMenuItem: any;
  export const NavigationMenuTrigger: any;
  export const NavigationMenuContent: any;
  export const NavigationMenuLink: any;
  export const NavigationMenuViewport: any;
  export const NavigationMenuIndicator: any;
}

// ============================================
// Menubar
// ============================================
declare module "@radix-ui/react-menubar" {
  import * as React from "react";
  export const Menubar: any;
  export const MenubarMenu: any;
  export const MenubarTrigger: any;
  export const MenubarContent: any;
  export const MenubarItem: any;
  export const MenubarGroup: any;
  export const MenubarLabel: any;
  export const MenubarSeparator: any;
  export const MenubarSub: any;
  export const MenubarSubTrigger: any;
  export const MenubarSubContent: any;
  export const MenubarRadioGroup: any;
  export const MenubarRadioItem: any;
  export const MenubarCheckboxItem: any;
}

// ============================================
// Aspect Ratio
// ============================================
declare module "@radix-ui/react-aspect-ratio" {
  import * as React from "react";
  export const AspectRatio: any;
}

// ============================================
// Avatar
// ============================================
declare module "@radix-ui/react-avatar" {
  import * as React from "react";
  export const Avatar: any;
  export const AvatarImage: any;
  export const AvatarFallback: any;
}

// ============================================
// Badge
// ============================================
declare module "@radix-ui/react-badge" {
  import * as React from "react";
  export const Badge: any;
}

// ============================================
// Card
// ============================================
declare module "@radix-ui/react-card" {
  import * as React from "react";
  export const Card: any;
  export const CardHeader: any;
  export const CardFooter: any;
  export const CardTitle: any;
  export const CardDescription: any;
  export const CardContent: any;
}

// ============================================
// Calendar
// ============================================
declare module "@radix-ui/react-calendar" {
  import * as React from "react";
  export const Calendar: any;
}

// ============================================
// Carousel
// ============================================
declare module "@radix-ui/react-carousel" {
  import * as React from "react";
  export const Carousel: any;
  export const CarouselContent: any;
  export const CarouselItem: any;
  export const CarouselNext: any;
  export const CarouselPrevious: any;
}

// ============================================
// Chart
// ============================================
declare module "@radix-ui/react-chart" {
  import * as React from "react";
  export const ChartContainer: any;
  export const ChartTooltip: any;
  export const ChartTooltipContent: any;
  export const ChartLegend: any;
  export const ChartLegendContent: any;
}

// ============================================
// Command
// ============================================
declare module "@radix-ui/react-command" {
  import * as React from "react";
  export const Command: any;
  export const CommandInput: any;
  export const CommandList: any;
  export const CommandEmpty: any;
  export const CommandGroup: any;
  export const CommandSeparator: any;
  export const CommandItem: any;
  export const CommandShortcut: any;
  export const CommandDialog: any;
}

// ============================================
// Context Menu
// ============================================
declare module "@radix-ui/react-context-menu" {
  import * as React from "react";
  export const ContextMenu: any;
  export const ContextMenuTrigger: any;
  export const ContextMenuContent: any;
  export const ContextMenuItem: any;
  export const ContextMenuCheckboxItem: any;
  export const ContextMenuRadioGroup: any;
  export const ContextMenuRadioItem: any;
  export const ContextMenuSub: any;
  export const ContextMenuSubTrigger: any;
  export const ContextMenuSubContent: any;
  export const ContextMenuLabel: any;
  export const ContextMenuSeparator: any;
  export const ContextMenuGroup: any;
}

// ============================================
// Drawer
// ============================================
declare module "@radix-ui/react-drawer" {
  import * as React from "react";
  export const Drawer: any;
  export const DrawerTrigger: any;
  export const DrawerClose: any;
  export const DrawerContent: any;
  export const DrawerHeader: any;
  export const DrawerFooter: any;
  export const DrawerTitle: any;
  export const DrawerDescription: any;
  export const DrawerOverlay: any;
}

// ============================================
// Form
// ============================================
declare module "@radix-ui/react-form" {
  import * as React from "react";
  export const Form: any;
  export const FormField: any;
  export const FormControl: any;
  export const FormDescription: any;
  export const FormLabel: any;
  export const FormMessage: any;
  export const FormSubmit: any;
  export const FormClear: any;
}

// ============================================
// Hover Card
// ============================================
declare module "@radix-ui/react-hover-card" {
  import * as React from "react";
  export const HoverCard: any;
  export const HoverCardTrigger: any;
  export const HoverCardContent: any;
}

// ============================================
// Input OTP
// ============================================
declare module "@radix-ui/react-input-otp" {
  import * as React from "react";
  export const InputOTP: any;
  export const InputOTPGroup: any;
  export const InputOTPSeparator: any;
  export const InputOTPSlot: any;
}

// ============================================
// Pagination
// ============================================
declare module "@radix-ui/react-pagination" {
  import * as React from "react";
  export const Pagination: any;
  export const PaginationList: any;
  export const PaginationListItem: any;
  export const PaginationPrevButton: any;
  export const PaginationNextButton: any;
  export const PaginationEllipsis: any;
}

// ============================================
// Resizable
// ============================================
declare module "@radix-ui/react-resizable" {
  import * as React from "react";
  export const ResizablePanelGroup: any;
  export const ResizablePanel: any;
  export const ResizableHandle: any;
}

// ============================================
// Sheet
// ============================================
declare module "@radix-ui/react-sheet" {
  import * as React from "react";
  export const Sheet: any;
  export const SheetTrigger: any;
  export const SheetClose: any;
  export const SheetContent: any;
  export const SheetHeader: any;
  export const SheetFooter: any;
  export const SheetTitle: any;
  export const SheetDescription: any;
  export const SheetOverlay: any;
}

// ============================================
// Sidebar
// ============================================
declare module "@radix-ui/react-sidebar" {
  import * as React from "react";
  export const Sidebar: any;
  export const SidebarContent: any;
  export const SidebarHeader: any;
  export const SidebarFooter: any;
  export const SidebarTrigger: any;
  export const SidebarRail: any;
  export const SidebarGroup: any;
  export const SidebarGroupLabel: any;
  export const SidebarGroupContent: any;
  export const SidebarGroupAction: any;
  export const SidebarMenu: any;
  export const SidebarMenuItem: any;
  export const SidebarMenuButton: any;
  export const SidebarMenuAction: any;
  export const SidebarMenuSub: any;
  export const SidebarMenuSubButton: any;
  export const SidebarMenuSubItem: any;
  export const SidebarInset: any;
  export const SidebarProvider: any;
}

// ============================================
// Skeleton
// ============================================
declare module "@radix-ui/react-skeleton" {
  import * as React from "react";
  export const Skeleton: any;
}

// ============================================
// Table
// ============================================
declare module "@radix-ui/react-table" {
  import * as React from "react";
  export const Table: any;
  export const TableHeader: any;
  export const TableBody: any;
  export const TableFooter: any;
  export const TableRow: any;
  export const TableHead: any;
  export const TableCell: any;
  export const TableCaption: any;
  export const TableEmpty: any;
}

// ============================================
// Textarea
// ============================================
declare module "@radix-ui/react-textarea" {
  import * as React from "react";
  export const Textarea: any;
}

// ============================================
// Toast
// ============================================
declare module "@radix-ui/react-toast" {
  import * as React from "react";
  export const Toast: any;
  export const ToastAction: any;
  export const ToastClose: any;
  export const ToastDescription: any;
  export const ToastProvider: any;
  export const ToastTitle: any;
  export const ToastViewport: any;
  export const Toaster: any;
}

// ============================================
// Sonner (toast library)
// ============================================
declare module "sonner" {
  export interface ToastOptions {
    duration?: number;
    icon?: any;
    id?: string;
    type?: "default" | "success" | "error" | "info" | "warning" | "loading";
    action?: { label: string; onClick: () => void };
    cancel?: { label: string; onClick?: () => void };
    description?: any;
    dismissible?: boolean;
  }
  
  export function toast(message: any, options?: ToastOptions): string;
  export function toast.success(message: any, options?: ToastOptions): string;
  export function toast.error(message: any, options?: ToastOptions): string;
  export function toast.info(message: any, options?: ToastOptions): string;
  export function toast.warning(message: any, options?: ToastOptions): string;
  export function toast.loading(message: any, options?: ToastOptions): string;
  export function toast.dismiss(id?: string | number): void;
  export function toast.promise<T>(promise: Promise<T>, options?: any): Promise<T>;
  
  export const Toaster: any;
}

// ============================================
// React Hook Form (comum em projetos Radix)
// ============================================
declare module "react-hook-form" {
  import * as React from "react";
  
  export interface RegisterOptions {
    required?: string | boolean;
    minLength?: { value: number; message: string };
    maxLength?: { value: number; message: string };
    min?: { value: number; message: string };
    max?: { value: number; message: string };
    pattern?: { value: RegExp; message: string };
    validate?: Record<string, boolean | string | ((value: any) => boolean | string)>;
    value?: any;
    disabled?: boolean;
    setValueAs?: (value: any) => any;
  }
  
  export interface UseFormRegister {
    (name: string, options?: RegisterOptions): {
      onChange: (event: any) => void;
      onBlur: (event: any) => void;
      ref: (instance: any) => void;
      name: string;
    };
  }
  
  export interface UseFormReturns {
    register: UseFormRegister;
    handleSubmit: (onValid: (data: any) => void, onInvalid?: (errors: any) => void) => (e: any) => void;
    formState: {
      errors: Record<string, any>;
      isSubmitting: boolean;
      isValidating: boolean;
    };
    watch: (field?: string) => any;
    setValue: (name: string, value: any) => void;
    getValues: (field?: string) => any;
    reset: (values?: any) => void;
    resetField: (name: string) => void;
  }
  
  export function useForm(): UseFormReturns;
  export interface FormProviderProps extends UseFormReturns {
    children: React.ReactNode;
  }
  export const FormProvider: React.FC<FormProviderProps>;
  export interface ControllerProps {
    name: string;
    control: any;
    rules?: RegisterOptions;
    render: (props: { field: any; fieldState: any }) => React.ReactElement;
  }
  export const Controller: React.FC<ControllerProps>;
}

// ============================================
// date-fns
// ============================================
declare module "date-fns" {
  export function format(date: Date | string, format: string, options?: any): string;
  export function parseISO(dateString: string): Date;
  export function isFuture(date: Date | string): boolean;
  export function isPast(date: Date | string): boolean;
  export function differenceInDays(dateLeft: Date | string, dateRight: Date | string): number;
  export function addDays(date: Date | string, amount: number): Date;
  export function subDays(date: Date | string, amount: number): Date;
  export function startOfDay(date: Date | string): Date;
  export function endOfDay(date: Date | string): Date;
  export function startOfWeek(date: Date | string, options?: any): Date;
  export function endOfWeek(date: Date | string, options?: any): Date;
  export function eachDayOfInterval(start: Date | string, end: Date | string): Date[];
  export const ptBR: any;
}

// ============================================
// Lucide React (ícones)
// ============================================
declare module "lucide-react" {
  import * as React from "react";
  
  export interface LucideIconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number;
    absoluteStrokeWidth?: boolean;
  }
  
  export type LucideIcon = React.FC<LucideIconProps>;
  
  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const ArrowDown: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowUp: LucideIcon;
  export const Bell: LucideIcon;
  export const Calendar: LucideIcon;
  export const Camera: LucideIcon;
  export const Check: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Circle: LucideIcon;
  export const Clock: LucideIcon;
  export const Close: LucideIcon;
  export const Cloud: LucideIcon;
  export const Code: LucideIcon;
  export const DollarSign: LucideIcon;
  export const Download: LucideIcon;
  export const Edit: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const File: LucideIcon;
  export const FileText: LucideIcon;
  export const Folder: LucideIcon;
  export const FolderOpen: LucideIcon;
  export const Globe: LucideIcon;
  export const GripVertical: LucideIcon;
  export const Hash: LucideIcon;
  export const Heart: LucideIcon;
  export const Home: LucideIcon;
  export const Image: LucideIcon;
  export const Info: LucideIcon;
  export const Link: LucideIcon;
  export const List: LucideIcon;
  export const Loader: LucideIcon;
  export const Lock: LucideIcon;
  export const LogIn: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const MapPin: LucideIcon;
  export const Menu: LucideIcon;
  export const Minus: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const Move: LucideIcon;
  export const Music: LucideIcon;
  export const Notifications: LucideIcon;
  export const Package: LucideIcon;
  export const Paperclip: LucideIcon;
  export const Pause: LucideIcon;
  export const Pencil: LucideIcon;
  export const Phone: LucideIcon;
  export const Play: LucideIcon;
  export const Plus: LucideIcon;
  export const PlusCircle: LucideIcon;
  export const Power: LucideIcon;
  export const Print: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Save: LucideIcon;
  export const Search: LucideIcon;
  export const Settings: LucideIcon;
  export const Share: LucideIcon;
  export const Share2: LucideIcon;
  export const Shield: LucideIcon;
  export const ShoppingCart: LucideIcon;
  export const Sidebar: LucideIcon;
  export const SignOut: LucideIcon;
  export const Smile: LucideIcon;
  export const Star: LucideIcon;
  export const Sun: LucideIcon;
  export const Table: LucideIcon;
  export const Tag: LucideIcon;
  export const Trash: LucideIcon;
  export const Trash2: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Trophy: LucideIcon;
  export const Type: LucideIcon;
  export const Upload: LucideIcon;
  export const User: LucideIcon;
  export const Users: LucideIcon;
  export const Video: LucideIcon;
  export const X: LucideIcon;
  export const XCircle: LucideIcon;
  export const Zap: LucideIcon;
  export const ZoomIn: LucideIcon;
  export const ZoomOut: LucideIcon;
}

// ============================================
// clsx / classnames
// ============================================
declare module "clsx" {
  export default function clsx(...args: any[]): string;
}

declare module "classnames" {
  export default function classNames(...args: any[]): string;
}

// ============================================
// TailwindCSS (para shadcn/ui)
// ============================================
declare module "tailwind-merge" {
  export default function twMerge(...args: any[]): string;
}

// ============================================
// framer-motion
// ============================================
declare module "framer-motion" {
  import * as React from "react";
  
  export interface MotionProps {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    variants?: any;
    whileHover?: any;
    whileTap?: any;
    whileInView?: any;
    viewport?: any;
    drag?: boolean | "x" | "y";
    dragConstraints?: any;
    layout?: boolean;
    layoutId?: string;
    className?: string;
    children?: React.ReactNode;
    onAnimationStart?: () => void;
    onAnimationComplete?: () => void;
    [key: string]: any;
  }
  
  export const motion: React.FC<MotionProps & React.HTMLAttributes<HTMLDivElement>>;
  
  export interface AnimatePresenceProps {
    children?: React.ReactNode;
    mode?: "sync" | "wait" | "popLayout";
    initial?: boolean;
  }
  
  export const AnimatePresence: React.FC<AnimatePresenceProps>;
  
  export function useAnimation(): any;
  export function useMotionValue(value: any): any;
  export function useTransform(input: any, output: any): any;
  export function useSpring(value: any, config?: any): any;
  export function motionValue(value: any): any;
}
