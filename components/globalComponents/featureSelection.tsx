import { cn } from "@/lib/utils";
import {
    // IconAdjustmentsBolt,
    IconAlertTriangle,
    IconBrain,
    IconChartBar,
    // IconCloud,
    // IconCurrencyDollar,
    // IconEaseInOut,
    // IconHeart,
    // IconHelp,
    IconLayoutDashboard,
    IconLockDollar,
    IconMedal,
    IconMessageChatbot,
    IconPuzzle2,
    // IconRouteAltLeft,
    // IconTerminal2,
} from "@tabler/icons-react";

export function FeaturesSectionDemo() {
  const features = [
    {
      title: "Escrow Payments",
      description:
        "Your money stays safe — funds are held until the deal is fulfilled by both parties.",
      icon: <IconLockDollar className="h-5 w-5 md:h-6 md:w-6" />, // Icon: LockDollar
    },
    {
      title: "AI-Powered Dispute Resolution",
      description:
        "No more back-and-forths — our AI reviews chats and deal terms to suggest fair, fast outcomes.",
      icon: <IconBrain className="h-5 w-5 md:h-6 md:w-6" />, // Icon: Brain
    },
    {
      title: "Sleek, Minimalistic UI",
      description:
        "No clutter, just clarity — browse, buy, and sell with a clean, intuitive experience.",
      icon: <IconLayoutDashboard className="h-5 w-5 md:h-6 md:w-6" />, // Icon: LayoutDashboard
    },
    {
      title: "In-App Chat + Monitoring",
      description:
        "Stay connected, stay protected — all messages are logged and AI-reviewed for safety.",
      icon: <IconMessageChatbot className="h-5 w-5 md:h-6 md:w-6" />, // Icon: MessageChatbot
    },
    {
      title: "Fraud Detection & Flagging",
      description:
        "Scammers get spotted fast — repeated offenders and suspicious patterns are auto-flagged.",
      icon: <IconAlertTriangle className="h-5 w-5 md:h-6 md:w-6" />, // Icon: AlertTriangle
    },
    {
      title: "Purchase/Selling Analytics",
      description:
        "Know your numbers — track performance, pricing trends, and deal outcomes in one place.",
      icon: <IconChartBar className="h-5 w-5 md:h-6 md:w-6" />, // Icon: ChartBar
    },
    {
      title: "Chrome Extension",
      description:
        "Bring Vault’s protection anywhere — apply escrow and AI dispute tools on other websites.",
      icon: <IconPuzzle2 className="h-5 w-5 md:h-6 md:w-6" />, // Icon: Puzzle2
    },
    {
      title: "Gamification (Trust Scores, Rewards)",
      description:
        "Earn while you trade — build your reputation, unlock perks, and get rewarded for playing fair.",
      icon: <IconMedal className="h-5 w-5 md:h-6 md:w-6" />, // Icon: Medal
    },
  ];
  
      
    return (
        <div className="relative z-10 py-10 md:py-16 max-w-7xl mx-auto" id="features">
            {/* New Heading & Description Section */}
            <div className="text-center max-w-4xl mx-auto mb-6 md:mb-10">
                <h1 className="text-xl md:text-2xl font-extrabold text-black dark:text-white drop-shadow-lg dark:drop-shadow-[0_4px_10px_rgba(255,255,255,0.3)] leading-tight">
                    <span className="block md:inline">A powerful solution that empowers you with advanced fraud prevention,</span>
                    <span className="block md:inline">AI-driven dispute resolution, and more</span>
                </h1>
                <p className="text-base md:text-lg mt-3 md:mt-5 text-muted-foreground font-medium">
                    Trade confidently by empowering yourself with Vault's secure ecosystem.
                </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {features.map((feature, index) => (
                    <Feature key={feature.title} {...feature} index={index} />
                ))}
            </div>
        </div>
    );
}

const Feature = ({
    title,
    description,
    icon,
    index,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    index: number;
}) => {
    return (
        <div
            className={cn(
                "flex flex-col py-6 md:py-8 relative group/feature dark:border-neutral-800",
                "border-b md:border-b-0", // Add bottom border for mobile/small screens
                (index % 2 === 0) && "sm:border-r dark:sm:border-neutral-800", // Right border for even items on small screens
                (index > 1) && "sm:border-t dark:sm:border-neutral-800", // Top border for items below the first two on small screens
                "lg:border-r-0 lg:border-b", // Reset borders for large screens, add bottom border
                (index % 4 !== 3) && "lg:border-r dark:lg:border-neutral-800" // Right border for all except the last in each row on large screens
            )}
        >
            {index < 4 && (
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
            )}
            {index >= 4 && (
                <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
            )}
            <div className="mb-3 relative z-10 px-4 md:px-6 text-neutral-600 dark:text-neutral-400">
                {icon}
            </div>
            <div className="text-base font-bold mb-1 relative z-10 px-4 md:px-6">
                <div className="absolute left-0 inset-y-0 h-5 group-hover/feature:h-6 w-0.5 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-blue-500 transition-all duration-200 origin-center" />
                <h3 className="group-hover/feature:translate-x-1 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
                    {title}
                </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-4 md:px-6">
                {description}
            </p>
        </div>
    );
};