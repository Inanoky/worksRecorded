// worksRecorded\app\dashboard\layout.tsx

import { ReactNode } from "react";
import Link from "next/link";

import { DashboardItems } from "@/components/dashboard/DashboardItems";
import { BadgeQuestionMark, CircleUser, X } from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { LanguageFlagSwitcher } from "@/components/dashboard/LanguageFlagSwitcher";
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
import { getDashboardMessages } from "@/lib/dashboard-i18n";
import { hasAiContextAccess, hasAiEvalAccess } from "@/lib/utils/ai-context-access";
import { isAiEvalUiEnabled } from "@/lib/ai-evals/local-gate";
import { getOrganizationLanguageByUserId, getUserEmailByUserId } from "@/server/actions/shared-actions";
import { clearUserTourAction } from "@/components/joyride/user-tour-action";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();
  const userId = user.id;
  const [email, organizationLanguage] = await Promise.all([
    getUserEmailByUserId(user.id),
    getOrganizationLanguageByUserId(user.id),
  ]);
  const t = getDashboardMessages(organizationLanguage);
  const canAccessAiContext = hasAiContextAccess(userId);
  const canAccessAiEvals = hasAiEvalAccess(userId) && isAiEvalUiEnabled();

  return (
    <ProjectProvider userId={userId}>
      <section className="min-h-screen w-full flex flex-col">
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
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:h-[64px] lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu button - only shows on small screens */}
            <div className="lg:hidden">
              <MobileMenu
                organizationLanguage={organizationLanguage}
                canAccessAiContext={canAccessAiContext}
                canAccessAiEvals={canAccessAiEvals}
              />
            </div>

            {/* Logo - smaller on mobile */}
            <Link href="/" className="flex items-center gap-2 font-semibold shrink-0">
            
              <h3 className="text-xl lg:text-2xl tracking-tight">
                Works<span className="text-green-700">Recorded</span>
              </h3>
            </Link>

          {/* Navigation - hidden on mobile, shown on desktop */}
          <nav className="hidden lg:flex gap-2 items-center flex-1 min-w-0 ml-3">
            <DashboardItems
              userEmail={email}
              organizationLanguage={organizationLanguage}
              canAccessAiContext={canAccessAiContext}
              canAccessAiEvals={canAccessAiEvals}
            />
          </nav>
          </div>

          {/* Theme/User menu */}
          <div className="flex items-center gap-x-2 lg:gap-x-3 shrink-0">
            <div className="hidden md:block max-w-[220px] truncate rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              {email}
            </div>
            <LanguageFlagSwitcher currentLanguage={organizationLanguage} />
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
                  <LogoutLink>{t.logOut}</LogoutLink>
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
                      Repeat Tutorial
                    </button>
                  </form>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <a href="#contact-modal" className="w-full text-left">
                    Contact us
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
          aria-label="Contact us dialog"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">Contact us</div>
              <a
                href="#"
                aria-label="Close"
                className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </a>
            </div>

            <div className="space-y-3 px-4 py-4 sm:px-5">
              <div className="text-sm leading-relaxed text-muted-foreground">
                Contact us any time if you have any questions or problems.
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <div className="text-muted-foreground">Email</div>
                  <a
                    className="block max-w-full break-all text-sm font-medium underline underline-offset-4 sm:break-words"
                    href="mailto:vjaceslavs.gromatovics@buvconsult.com"
                  >
                    vjaceslavs.gromatovics@buvconsult.com
                  </a>
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground">Phone</div>
                  <a
                    className="font-medium underline underline-offset-4"
                    href="tel:+37124885690"
                  >
                    +37124885690
                  </a>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <a href="#" className="inline-flex">
                  <Button variant="secondary" className="w-full sm:w-auto">Close</Button>
                </a>
                <a
                  href="mailto:vjaceslavs.gromatovics@buvconsult.com"
                  className="inline-flex"
                >
                  <Button className="w-full sm:w-auto">Email us</Button>
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
