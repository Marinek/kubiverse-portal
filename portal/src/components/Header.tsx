import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";

export const Header = () => {
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
            <a href="/#kubiverse" className="text-sm font-medium hover:text-primary transition-colors">
              Was ist das Kubiverse?
            </a>
            <a href="/#deployment" className="text-sm font-medium hover:text-primary transition-colors">
              Projekt veröffentlichen
            </a>
            <a href="#documentation" className="text-sm font-medium hover:text-primary transition-colors">
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
          </div>
        </div>
      </div>
    </header>
  );
};