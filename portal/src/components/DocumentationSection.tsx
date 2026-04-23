import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  ExternalLink, 
  HelpCircle, 
  MessageCircle, 
  FileText,
  Users,
  Zap,
  AlertCircle
} from "lucide-react";

export const DocumentationSection = () => {
  const resources = [
    {
      icon: BookOpen,
      title: "Deployment-Guide",
      description: "Ausführliche Anleitung zum Deployment von Projekten im Kubiverse",
      type: "Confluence",
      color: "bg-blue-500",
      urgent: false,
      link: import.meta.env.VITE_DOCS_DEPLOYMENT_GUIDE_URL || "#"
    },
    {
      icon: FileText,
      title: "Git-Konventionen",
      description: "Branch-Naming, Commit-Messages und Workflow-Standards",
      type: "Confluence", 
      color: "bg-green-500",
      urgent: false,
      link: import.meta.env.VITE_DOCS_GIT_CONVENTIONS_URL || "#"
    },
    {
      icon: Zap,
      title: "CI/CD Pipeline-Konfiguration",
      description: "Setup und Konfiguration der automatisierten Deployment-Pipelines",
      type: "Confluence",
      color: "bg-purple-500",
      urgent: false,
      link: import.meta.env.VITE_DOCS_CICD_PIPELINE_URL || "#"
    },
    {
      icon: AlertCircle,
      title: "Troubleshooting",
      description: "Häufige Probleme und deren Lösungen bei Deployments",
      type: "Confluence",
      color: "bg-orange-500",
      urgent: true,
      link: import.meta.env.VITE_DOCS_TROUBLESHOOTING_URL || "#"
    }
  ];

  const contacts = [
    {
      icon: Users,
      title: "DevOps-Team",
      description: "Technische Unterstützung bei Deployment-Problemen",
      contact: "fms-devops@materna.group"
    }
  ];

  return (
    <section id="documentation" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <BookOpen className="w-4 h-4 mr-2" />
            Hilfe & Support
          </Badge>
          <h2 className="text-4xl font-bold mb-6">Dokumentation & Hilfe</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Finden Sie alle notwendigen Ressourcen, Anleitungen und Kontakte für 
            eine erfolgreiche Nutzung des FMS-Kubiverse.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-primary" />
              Dokumentation
            </h3>
            <div className="space-y-4">
              {resources.map((resource, index) => (
                <a 
                  key={index} 
                  href={resource.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block group"
                >
                  <Card className="hover:shadow-card transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`w-10 h-10 ${resource.color} rounded-lg flex items-center justify-center`}>
                            <resource.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <CardTitle className="text-lg">{resource.title}</CardTitle>
                              {resource.urgent && (
                                <Badge variant="destructive" className="text-xs">
                                  Wichtig
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {resource.type}
                            </Badge>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {resource.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center">
              <HelpCircle className="w-6 h-6 mr-3 text-primary" />
              Support & Kontakt
            </h3>
            <div className="space-y-4">
              {contacts.map((contact, index) => (
                <Card key={index} className="group hover:shadow-card transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <contact.icon className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{contact.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {contact.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Kontakt:</span>
                        <a 
                          href={`mailto:${contact.contact}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {contact.contact}
                        </a>
                      </div>
                      {import.meta.env.VITE_TEAMS_CHAT_URL && (
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-medium">Teams Chat:</span>
                          <a 
                            href={import.meta.env.VITE_TEAMS_CHAT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center"
                          >
                            Chat öffnen
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="group">
              <ExternalLink className="w-4 h-4 mr-2" />
              Confluence öffnen
            </Button>
            <Button variant="outline" size="lg">
              <MessageCircle className="w-4 h-4 mr-2" />
              Support kontaktieren
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};