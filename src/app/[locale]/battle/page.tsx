import { redirect } from "@/i18n/routing";

/**
 * Legacy route — "Battle" is now GreeCompare. Kept as a permanent redirect so
 * old links, PWA shortcuts and browser history don't break after the rename.
 */
export default async function BattleRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/compare", locale });
}
