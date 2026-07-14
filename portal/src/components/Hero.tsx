import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket } from "lucide-react";
import heroImage from "@/assets/hero-kubiverse.jpg";
import { ProjectInitWizard } from "./ProjectInitWizard";

export const Hero = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/80 to-slate-900/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 inline-flex items-center px-4 py-1.5 rounded-full bg-slate-800/80 text-slate-200 border border-slate-600 shadow-sm backdrop-blur-sm">
            <Rocket className="w-4 h-4 mr-2 text-white" />
            <span className="text-sm font-medium text-white">Kubernetes-basierte Deployment-Plattform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-primary-foreground">
            Willkommen im{" "}
            FMS-Kubiverse
          </h1>

          <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto leading-relaxed">
            Dein Portal zur automatisierten Testwelt – Skalierbare Kubernetes-Deployments
            für Formularmanagement-Projekte mit CI/CD-Integration
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" variant="secondary" className="group" onClick={() => setIsWizardOpen(true)}>
              Projekt deployen
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="secondary" className="group">
              Dokumentation ansehen
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      <ProjectInitWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} />
    </section>
  );
};