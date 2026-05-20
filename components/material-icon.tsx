import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  CirclePlus,
  Eye,
  FileDown,
  Gauge,
  Heart,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreVertical,
  MonitorCog,
  Palette,
  PanelLeftOpen,
  PenLine,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Target,
  TrendingUp,
  UserCircle,
  Users,
  WandSparkles,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  account_balance_wallet: CircleDollarSign,
  account_circle: UserCircle,
  ac_unit: Snowflake,
  add: CirclePlus,
  add_circle: CirclePlus,
  ads_click: Target,
  analytics: BarChart3,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  auto_awesome: Sparkles,
  auto_graph: Activity,
  autorenew: RefreshCw,
  bolt: WandSparkles,
  campaign: Gauge,
  cancel: XCircle,
  check_circle: CheckCircle2,
  chevron_right: ChevronRight,
  contact_support: Bot,
  dashboard: LayoutDashboard,
  download: FileDown,
  edit_note: PenLine,
  favorite: Heart,
  group: Users,
  groups: Users,
  help_outline: CircleHelp,
  history: History,
  hub: Share2,
  insights: WandSparkles,
  interests: Sparkles,
  key: KeyRound,
  logout: LogOut,
  menu: Menu,
  menu_open: PanelLeftOpen,
  monitoring: MonitorCog,
  more_vert: MoreVertical,
  notifications: Bell,
  palette: Palette,
  refresh: RefreshCw,
  rocket_launch: Rocket,
  search: Search,
  send: Send,
  settings: Settings,
  admin_panel_settings: ShieldCheck,
  shopping_cart_checkout: ShoppingCart,
  sync: RefreshCw,
  trending_up: TrendingUp,
  verified: CheckCircle2,
  visibility: Eye,
  warning: AlertTriangle
};

export function MaterialIcon({
  name,
  filled = false,
  className
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  const Icon = icons[name] ?? CircleHelp;

  return (
    <Icon
      aria-hidden="true"
      className={cn("h-[1em] w-[1em] shrink-0 text-[24px] stroke-[2]", filled && "stroke-[2.4]", className)}
    />
  );
}
