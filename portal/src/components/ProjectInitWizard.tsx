import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, HelpCircle } from "lucide-react";
import { ProjectInitSchema, ProjectInitPayload } from "@kubiverse/shared";
import tafiMascot from "../assets/TAFI.svg";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectInitWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SequentialTypewriter = ({ logs, isSubmitting }: { logs: any[], isSubmitting: boolean }) => {
  const [visibleChars, setVisibleChars] = useState(0);
  const textArray = logs.map(log => log.message || log.status || "");
  const totalChars = textArray.reduce((sum, text) => sum + text.length, 0);

  useEffect(() => {
    if (visibleChars < totalChars) {
      const timer = setInterval(() => {
        setVisibleChars(prev => Math.min(prev + 2, totalChars));
      }, 10);
      return () => clearInterval(timer);
    }
  }, [totalChars, visibleChars]);

  let charsLeftToDistribute = visibleChars;

  return (
    <>
      {logs.length === 0 && isSubmitting && (
         <div className="text-green-400">Initialisiere Projektumgebung<span className="animate-pulse">...</span></div>
      )}
      {logs.map((log, i) => {
        const text = textArray[i];
        if (charsLeftToDistribute <= 0) return null;
        
        const take = Math.min(charsLeftToDistribute, text.length);
        charsLeftToDistribute -= take;
        
        const displayedText = text.substring(0, take);
        const isTypingThisLine = take < text.length && charsLeftToDistribute === 0;

        return (
          <div key={i} className={log.type === 'error' ? 'text-red-500 font-bold' : log.type === 'warn' ? 'text-yellow-400' : 'text-green-400'}>
            {displayedText}
            {isTypingThisLine && <span className="animate-pulse">_</span>}
          </div>
        );
      })}
      {isSubmitting && logs.length > 0 && visibleChars >= totalChars && (
         <div className="text-green-400 animate-pulse mt-2">_</div>
      )}
    </>
  );
};

export function ProjectInitWizard({ open, onOpenChange }: ProjectInitWizardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ type: string, message?: string, status?: string }[]>([]);

  const form = useForm<ProjectInitPayload>({
    resolver: zodResolver(ProjectInitSchema),
    defaultValues: {
      project_type: "LIP_4",
      project_name: "",
      project_customer: "",
      dbms: "postgres",
      project_directory: "project",
      deployment: "none",
      deployment_name: "",
      build_image_name: "",
      notification_failure_email: "",
    },
  });

  const deploymentValue = form.watch("deployment");
  const projectTypeValue = form.watch("project_type");

  useEffect(() => {
    if (!activeJobId) return;

    const sse = new EventSource(`/orchestrator/api/v1/projects/status/${activeJobId}`);

    sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setLogs((prev) => [...prev, data]);

      if (data.type === 'done') {
        sse.close();
        setIsSubmitting(false);
      }
    };

    sse.onerror = () => {
      sse.close();
      setIsSubmitting(false);
    };

    return () => sse.close();
  }, [activeJobId]);

  async function submitData(data: ProjectInitPayload) {
    setIsSubmitting(true);
    setLogs([]);
    setActiveJobId(null);
    try {
      const endpoint = '/orchestrator/api/v1/projects/init';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('API Request failed');

      const result = await response.json();
      setActiveJobId(result.jobId);
    } catch (error) {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(data: ProjectInitPayload) {
    await submitData(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        {activeJobId ? (
          <>
            <DialogHeader>
              <DialogTitle>Job Status: {activeJobId}</DialogTitle>
              <DialogDescription>
                Die Saga wird ausgeführt. Live-Logs vom Backend:
              </DialogDescription>
            </DialogHeader>
            <div className="bg-black p-6 rounded-md min-h-[300px] max-h-[400px] flex flex-col md:flex-row gap-6 border border-border">
              <div className="bg-[#c30a17] rounded-xl p-4 flex items-center justify-center shrink-0 self-start shadow-lg ring-1 ring-black/10">
                <img src={tafiMascot} alt="TAFI Mascot" className="w-24 h-24 object-contain drop-shadow-md" />
              </div>
              
              <div className="text-green-400 font-mono text-sm flex-1 overflow-y-auto space-y-1 pr-2">
                <SequentialTypewriter logs={logs} isSubmitting={isSubmitting} />
              </div>
            </div>
            <div className="flex justify-end pt-4 mt-auto">
              <Button onClick={() => { setActiveJobId(null); onOpenChange(false); }} disabled={isSubmitting}>
                {isSubmitting ? 'Läuft...' : 'Schließen'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>Projekt initialisieren</span>
                <Popover>
                  <PopoverTrigger type="button" tabIndex={-1} className="flex items-center">
                    <HelpCircle className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[450px] text-sm" side="right" align="start">
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                      <h4 className="font-semibold border-b pb-2 mb-2">Feldbeschreibungen</h4>

                      <div className="text-muted-foreground">
                        <strong className="text-foreground">Projekt Typ:</strong> Wählt die Projektvorlage aus. LIP 4 ist der aktuelle Standard für Formularmanagement-Projekte.
                      </div>

                      {projectTypeValue === "LIP_4" && (
                        <>
                          <div className="text-muted-foreground">
                            <strong className="text-foreground">Projekt Name:</strong> Der technische Name des Projekts. Wird für das Git-Repository, Kubernetes Namespaces und URLs verwendet (max. 63 Zeichen).
                          </div>

                          <div className="text-muted-foreground">
                            <strong className="text-foreground">Kunde:</strong> Der Name des Kunden. Wird genutzt, um Projekte logisch zu gruppieren (als Ordner-Struktur in Jenkins oder Projekte in Bitbucket).
                          </div>

                          <div className="text-muted-foreground">
                            <strong className="text-foreground">Datenbanksystem:</strong> Das primäre Datenbanksystem, das für das Projekt provisioniert werden soll.
                          </div>

                          <div className="text-muted-foreground">
                            <strong className="text-foreground">Projektverzeichnis:</strong> Das Unterverzeichnis im Repository, in dem der eigentliche Code liegt (Standard: 'project').
                          </div>

                          <div className="text-muted-foreground">
                            <strong className="text-foreground">Deployment-Strategie:</strong> Legt fest, wo die Anwendung betrieben wird. Standardmäßig im Kubernetes-Cluster.
                          </div>

                          <div className="text-muted-foreground">
                            <strong className="text-foreground">VM Name:</strong> Der eindeutige Hostname der virtuellen Maschine, falls ein traditionelles VM-Deployment gewählt wurde.
                          </div>

                          <div className="text-muted-foreground">
                            <strong className="text-foreground">Build Image Name:</strong> Optional: Ein abweichender Name für das Docker-Image. Standardmäßig wird der Projektname verwendet.
                          </div>

                          <div className="text-muted-foreground">
                            <strong className="text-foreground">Fehler-Benachrichtigung (E-Mail):</strong> An diese Adresse werden E-Mails geschickt, falls die CI/CD Pipeline fehlschlägt.
                          </div>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </DialogTitle>
              <DialogDescription>
                Konfigurieren Sie hier die initiale Projektumgebung. Repository, Pipelines und
                Kubernetes-Konfigurationen werden automatisch erstellt.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Modular Project Type Selector */}
                <FormField
                  control={form.control}
                  name="project_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projekt Typ *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wähle einen Typ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LIP_4">LIP 4 (Standard)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* LIP 4 Specific Fields */}
                {projectTypeValue === "LIP_4" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="project_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Projekt Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="mein-projekt" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="project_customer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kunde *</FormLabel>
                            <FormControl>
                              <Input placeholder="Kundenname" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dbms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Datenbanksystem *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Wähle eine Datenbank" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="postgres">PostgreSQL</SelectItem>
                                <SelectItem value="mysql">MySQL</SelectItem>
                                <SelectItem value="mariadb">MariaDB</SelectItem>
                                <SelectItem value="oracle">Oracle</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="project_directory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Projektverzeichnis</FormLabel>
                            <FormControl>
                              <Input placeholder="project" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                      <h4 className="text-sm font-medium">Deployment Konfiguration</h4>

                      <FormField
                        control={form.control}
                        name="deployment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deployment-Strategie</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Wähle eine Strategie" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Kubernetes (Standard)</SelectItem>
                                <SelectItem value="deploy">VM Deployment</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {deploymentValue === "deploy" && (
                        <FormField
                          control={form.control}
                          name="deployment_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>VM Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="meine-vm" {...field} />
                              </FormControl>
                              <FormDescription>
                                Da Sie 'VM Deployment' gewählt haben, ist dieses Feld zwingend erforderlich.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="build_image_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Build Image Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional (Fallback auf Projekt Name)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notification_failure_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fehler-Benachrichtigung (E-Mail)</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="devops@materna.group" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end items-center pt-4">
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isSubmitting}
                    >
                      Abbrechen
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Init...
                        </>
                      ) : (
                        "Projekt anlegen"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
