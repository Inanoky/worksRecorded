// worksRecorded\app\dashboard\layout.tsx

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/buvconsultLogo.svg";
import { DashboardItems } from "@/components/dashboard/DashboardItems";
import { BadgeQuestionMark, CircleUser, X } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { ProjectProvider } from "@/components/providers/ProjectProvider";
import { MobileMenu } from "../../components/dashboard/MobileMenu";
import { requireUser } from "../../lib/utils/requireUser";
import { getUserEmailByUserId } from "@/server/actions/shared-actions";
import { clearUserTourAction } from "@/components/joyride/user-tour-action";
import { getOrganizationLanguageByUserId } from "@/server/actions/shared-actions";
import { getDashboardLanguage, tDashboard } from "@/lib/dashboard-i18n";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const userId = user.id;
  const email = await getUserEmailByUserId(user.id);
  const organizationLanguage = await getOrganizationLanguageByUserId(user.id);
  const language = getDashboardLanguage(organizationLanguage);

  console.log(user.id);
  console.log(`this is email ${email}`);
  console.log(
    "[layout] runtime:",
    typeof EdgeRuntime !== "undefined" ? "EDGE" : "NODE"
  );
  console.log("[layout] email:", email);

  return (
    <ProjectProvider userId={userId}>
      <section className="min-h-screen w-full flex flex-col" data-dashboard-root="true">
        {/* CSS-only modal (hash :target) */}
        <style>{`
          #contact-modal {
            opacity: 0;
            pointer-events: none;
            transform: translateY(6px);
            transition: opacity 160ms ease, transform 160ms ease;
          }
          #contact-modal:target {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
          }
        `}</style>

        {/* Top Navigation Bar */}
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile menu button - only shows on small screens */}
            <div className="lg:hidden">
              <MobileMenu language={language} />
            </div>

            {/* Logo - smaller on mobile */}
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Image src={Logo} alt="Logo" className="size-8 lg:size-12" />
              <h3 className="text-xl lg:text-2xl">
                Works<span className="text-green-700">Recorded</span>
              </h3>
            </Link>
          </div>

          <div className="max-w-[150px] truncate">{email}</div>

          {/* Navigation - hidden on mobile, shown on desktop */}
          <nav className="hidden lg:flex gap-2 items-center flex-1 ml-6">
            <DashboardItems userEmail={email} language={language} />
          </nav>

          {/* Theme/User menu */}
          <div className="flex items-center gap-x-3 lg:gap-x-5">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full size-8 lg:size-10"
                >
                  <CircleUser className="h-4 w-4 lg:h-5 lg:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <LogoutLink>{tDashboard(language, "logOut")}</LogoutLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full size-8 lg:size-10"
                >
                  <BadgeQuestionMark className="h-4 w-4 lg:h-5 lg:w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <form action={clearUserTourAction}>
                    <button type="submit" className="w-full text-left">
                      {tDashboard(language, "repeatTutorial")}
                    </button>
                  </form>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <a href="#contact-modal" className="w-full text-left">
                    {tDashboard(language, "contactUs")}
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Contact modal */}
        <div
          id="contact-modal"
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
          aria-label={`${tDashboard(language, "contactUs")} dialog`}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">{tDashboard(language, "contactUs")}</div>
              <a
                href="#"
                aria-label="Close"
                className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </a>
            </div>

            <div className="px-4 py-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                {tDashboard(language, "contactDescription")}
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <div className="text-muted-foreground">{tDashboard(language, "email")}</div>
                  <a
                    className="font-medium underline underline-offset-4"
                    href="mailto:vjaceslavs.gromatovics@buvconsult.com"
                  >
                    vjaceslavs.gromatovics@buvconsult.com
                  </a>
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground">{tDashboard(language, "phone")}</div>
                  <a
                    className="font-medium underline underline-offset-4"
                    href="tel:+37124885690"
                  >
                    +37124885690
                  </a>
                </div>
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <a href="#" className="inline-flex">
                  <Button variant="secondary">{tDashboard(language, "close")}</Button>
                </a>
                <a
                  href="mailto:vjaceslavs.gromatovics@buvconsult.com"
                  className="inline-flex"
                >
                  <Button>{tDashboard(language, "emailUs")}</Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </section>
    </ProjectProvider>
  );
}
