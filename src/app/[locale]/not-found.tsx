import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <p className="text-6xl font-black gc-gradient-text">404</p>
      <p className="mt-2 text-muted">Page introuvable</p>
      <Link href="/" className="mt-6"><Button variant="neon">GreeCheck</Button></Link>
    </div>
  );
}
