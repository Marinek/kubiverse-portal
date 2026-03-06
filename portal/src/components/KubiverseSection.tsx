import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Container, 
  GitBranch, 
  Globe, 
  Lock, 
  Zap, 
  Layers,
  Shield,
  Workflow
} from "lucide-react";

export const KubiverseSection = () => {
  const features = [
    {
      icon: Container,
      title: "Kubernetes-Cluster",
      description: "Automatisierte Bereitstellung von Formularmanagement-Projekten in isolierten Containern"
    },
    {
      icon: Zap,
      title: "Skalierbarkeit",
      description: "Dynamische Ressourcenverwaltung und automatische Skalierung je nach Bedarf"
    },
    {
      icon: Workflow,
      title: "CI/CD-Integration",
      description: "Nahtlose Integration in bestehende Bitbucket-Pipelines und Deployment-Workflows"
    },
    {
      icon: Shield,
      title: "Isolierte Testumgebungen",
      description: "Jedes Projekt läuft in seinem eigenen Namespace für maximale Sicherheit"
    },
    {
      icon: Lock,
      title: "Internes Hosting",
      description: "Vollständige Kontrolle über Ihre Daten und Deployments in der eigenen Infrastruktur"
    },
    {
      icon: Globe,
      title: "URL-Generierung",
      description: "Automatische Generierung von zugänglichen URLs für alle deployten Projekte"
    }
  ];

  return (
    <section id="kubiverse" className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Layers className="w-4 h-4 mr-2" />
            Kubernetes-Plattform
          </Badge>
          <h2 className="text-4xl font-bold mb-6">Was ist das Kubiverse?</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Das FMS-Kubiverse ist eine speziell entwickelte Kubernetes-basierte Plattform zur 
            automatisierten Bereitstellung und Verwaltung von Formularmanagement-Projekten. 
            Es bietet eine moderne, skalierbare Lösung für Entwicklungs- und Testumgebungen.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-card transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:shadow-glow transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 p-8 bg-gradient-card rounded-2xl shadow-elegant">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
              <GitBranch className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Nahtlose Integration</h3>
              <p className="text-muted-foreground">
                Das Kubiverse integriert sich nahtlos in Ihre bestehende Entwicklungsumgebung. 
                Durch die Verbindung mit Bitbucket und automatisierten CI/CD-Pipelines 
                werden Ihre Projekte automatisch deployed, sobald Sie Code in einen 
                entsprechenden Branch pushen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};