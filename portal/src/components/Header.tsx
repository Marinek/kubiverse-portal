import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">K</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">FMS-Kubiverse</h1>
              <p className="text-sm text-muted-foreground">DevOps Portal</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <a href="#kubiverse" onClick={(e) => scrollTo(e, 'kubiverse')} className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">
              Was ist das Kubiverse?
            </a>
            <a href="#deployment" onClick={(e) => scrollTo(e, 'deployment')} className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">
              Projekt veröffentlichen
            </a>
            <a href="#documentation" onClick={(e) => scrollTo(e, 'documentation')} className="text-sm font-medium hover:text-primary transition-colors cursor-pointer">
              Dokumentation
            </a>
          </nav>

          <div className="flex items-center space-x-2">
            <Link to="/argocd">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm">
                <LayoutGrid className="w-4 h-4 mr-2" />
                Application Hub
              </Button>
            </Link>
            {import.meta.env.VITE_ARGOCD_UI_URL && (
              <a href={import.meta.env.VITE_ARGOCD_UI_URL} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm">
                  <img src="https://argo-cd.readthedocs.io/en/stable/assets/logo.png" alt="ArgoCD" className="w-4 h-4 mr-2 object-contain" />
                  ArgoCD
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};