"use client";
import { useTranslations } from "next-intl";
import { ShieldCheck, UserX, HardDrive, Database } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
  const t = useTranslations("privacy");
  const points = [
    { icon: UserX, label: t("noAccount") },
    { icon: HardDrive, label: t("localOnly") },
    { icon: Database, label: t("attribution") }
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeading title={t("title")} />

      <Card className="bg-deep-grad text-white">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur">
            <ShieldCheck className="h-7 w-7 text-neon" />
          </span>
          <p className="max-w-md text-sm leading-relaxed text-white/85">{t("statement")}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {points.map((p, i) => {
          const Icon = p.icon;
          return (
            <Card key={i} className="p-5">
              <Icon className="h-6 w-6 text-natural" />
              <p className="mt-3 text-sm font-medium">{p.label}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
