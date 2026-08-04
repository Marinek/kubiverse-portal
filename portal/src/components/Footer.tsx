import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Container, GitBranch, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const Footer = () => {
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
    <footer className="bg-card border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">K</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">FMS-Kubiverse</h3>
                <p className="text-sm text-muted-foreground">DevOps Portal</p>
              </div>
            </div>
            <p className="text-muted-foreground max-w-md mb-4">
              Moderne Kubernetes-basierte Deployment-Plattform für Formularmanagement-Projekte
              mit automatisierter CI/CD-Integration und skalierbare Testumgebungen.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                <Container className="w-3 h-3 mr-1" />
                Kubernetes
              </Badge>
              <Badge variant="outline" className="text-xs">
                <GitBranch className="w-3 h-3 mr-1" />
                CI/CD
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Sicher
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Plattform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#kubiverse" onClick={(e) => scrollTo(e, 'kubiverse')} className="hover:text-primary transition-colors cursor-pointer">Was ist das Kubiverse?</a></li>
              <li><a href="#deployment" onClick={(e) => scrollTo(e, 'deployment')} className="hover:text-primary transition-colors cursor-pointer">Deployment-Guide</a></li>
              <li><a href="#documentation" onClick={(e) => scrollTo(e, 'documentation')} className="hover:text-primary transition-colors cursor-pointer">Dokumentation</a></li>
              <li><span className="hover:text-primary transition-colors cursor-pointer">System-Status</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="mailto:devops@company.de" className="hover:text-primary transition-colors">DevOps-Team</a></li>
              <li><a href="mailto:it-support@company.de" className="hover:text-primary transition-colors">IT-Support</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Troubleshooting</a></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div className="text-sm text-muted-foreground mb-4 sm:mb-0">
            © 2024 FMS-Kubiverse. Interne Entwicklungsplattform.
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">Version 2.1.0</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">System Online</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};