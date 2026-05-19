import { Link, useLocation } from "@tanstack/react-router";
import gsap from "gsap";
import {
  ActivityIcon,
  BellIcon,
  BoxIcon,
  CpuIcon,
  DatabaseIcon,
  FileTextIcon,
  HistoryIcon,
  ImageIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  RefreshCcwIcon,
  SearchIcon,
  SettingsIcon,
  ShieldAlertIcon,
  SunMoonIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { AlertBadge } from "@/features/alerts/components/alert-badge";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

const navSections = [
  {
    label: "Workspace",
    items: [
      { to: "/", label: "Containers", icon: BoxIcon },
      { to: "/stats", label: "Stats", icon: ActivityIcon },
      { to: "/processes", label: "Processes", icon: CpuIcon },
    ],
  },
  {
    label: "Resources",
    items: [
      { to: "/images", label: "Images", icon: ImageIcon },
      { to: "/networks", label: "Networks", icon: NetworkIcon },
      { to: "/databases", label: "Databases", icon: DatabaseIcon },
    ],
  },
  {
    label: "Security",
    items: [
      { to: "/scan-history", label: "Scan History", icon: HistoryIcon },
      { to: "/sbom-history", label: "SBOMs", icon: FileTextIcon },
      { to: "/alerts", label: "Alerts", icon: ShieldAlertIcon, alert: true },
    ],
  },
] as const;

const pageTitles: Record<string, string> = {
  "/": "Containers",
  "/stats": "System Stats",
  "/processes": "Processes",
  "/images": "Images",
  "/networks": "Networks",
  "/databases": "Databases",
  "/scan-history": "Scan History",
  "/sbom-history": "SBOMs",
  "/alerts": "Alerts",
  "/settings": "Settings",
};

function isActiveRoute(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

function currentTitle(pathname: string) {
  const match = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => isActiveRoute(pathname, path));

  return match?.[1] ?? "VPS Monitor";
}

function HelmMark() {
  return (
    <div className="helm-mark" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 6L12 3L19 6V18L12 21L5 18V6Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M9 10L12 8L15 10V14L12 16L9 14V10Z" fill="currentColor" />
      </svg>
    </div>
  );
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const title = useMemo(() => currentTitle(location.pathname), [location.pathname]);

  useEffect(() => {
    if (!contentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".gsap-page-enter, [data-slot='card'], [data-slot='table-container']",
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.42,
          ease: "power3.out",
          stagger: 0.035,
          clearProps: "opacity,visibility,transform",
        }
      );
    }, contentRef);

    return () => ctx.revert();
  }, [location.pathname]);

  return (
    <div className="helm-shell">
      <aside className="helm-sidebar">
        <Link to="/" className="helm-brand">
          <HelmMark />
          <span className="min-w-0">
            <span className="helm-brand-name">helm<span>.</span></span>
            <span className="helm-brand-meta">vps console</span>
          </span>
        </Link>

        <div className="helm-nav-scroll">
          <nav className="helm-nav" aria-label="Main navigation">
            {navSections.map((section) => (
              <div key={section.label} className="helm-nav-section">
                <div className="helm-nav-label">{section.label}</div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActiveRoute(location.pathname, item.to);

                  return (
                    <Button
                      key={item.to}
                      variant="ghost"
                      asChild
                      className={cn("helm-nav-item", active && "is-active")}
                    >
                      <Link to={item.to}>
                        <Icon className="size-4" />
                        <span className="truncate">{item.label}</span>
                        {item.alert ? (
                          <span className="ml-auto">
                            <AlertBadge />
                          </span>
                        ) : null}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="helm-host-card">
          <span className="helm-host-dot" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">local</span>
            <span className="block truncate font-mono text-[10px] uppercase text-muted-foreground">
              docker socket
            </span>
          </span>
          <Badge variant="outline" className="ml-auto">live</Badge>
        </div>
      </aside>

      <div className="helm-main">
        <header className="helm-topbar">
          <div className="helm-crumbs">
            <LayoutDashboardIcon className="size-4 text-primary" />
            <span>production</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">{title}</span>
          </div>

          <div className="helm-command">
            <SearchIcon className="size-4 text-muted-foreground" />
            <Input
              aria-label="Global search"
              placeholder="Search containers, images, processes..."
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
              Ctrl K
            </kbd>
          </div>

          <div className="helm-top-actions">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="helm-icon-btn">
                  <RefreshCcwIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="helm-icon-btn" asChild>
                  <Link to="/alerts">
                    <BellIcon className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Alerts</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="helm-icon-btn"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                >
                  <SunMoonIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{resolvedTheme === "dark" ? "Light" : "Dark"} mode</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="icon" className="helm-icon-btn" asChild>
              <Link to="/settings">
                <SettingsIcon className="size-4" />
              </Link>
            </Button>
            <div className="helm-avatar">VM</div>
          </div>
        </header>

        <div ref={contentRef} className="helm-content">
          <div className="gsap-page-enter">{children}</div>
        </div>
      </div>
    </div>
  );
}
