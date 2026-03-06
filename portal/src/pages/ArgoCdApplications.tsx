import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Search, RefreshCw, AlertCircle, Globe, Mail, AppWindow, Star } from "lucide-react";
import kubicon from "@/assets/kubicon.png";

interface ArgoCdApplication {
    name: string;
    project: string;
    syncStatus: string;
    healthStatus: string;
    argocdUrl: string;
    externalUrls?: string[];
}

const fetchApplications = async (): Promise<ArgoCdApplication[]> => {
    const response = await fetch("/kubiverse/api/argocd/applications");
    if (!response.ok) {
        throw new Error("Fehler beim Laden der Applikationen");
    }
    return response.json();
};

const getProjectColor = (project: string) => {
    const colors = [
        "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-teal-500", "bg-green-500", "bg-indigo-500", "bg-rose-500"
    ];
    const lightColors = [
        "bg-blue-50/50", "bg-purple-50/50", "bg-pink-50/50", "bg-orange-50/50", "bg-teal-50/50", "bg-green-50/50", "bg-indigo-50/50", "bg-rose-50/50"
    ];
    const borderColors = [
        "border-blue-500/20", "border-purple-500/20", "border-pink-500/20", "border-orange-500/20", "border-teal-500/20", "border-green-500/20", "border-indigo-500/20", "border-rose-500/20"
    ];
    let hash = 0;
    for (let i = 0; i < project.length; i++) {
        hash = project.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return {
        bg: colors[index],
        lightBg: lightColors[index],
        border: borderColors[index],
    };
};

const ArgoCdApplications = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [favorites, setFavorites] = useState<string[]>([]);

    useEffect(() => {
        const storedFavorites = localStorage.getItem("kubiverse-favorites");
        if (storedFavorites) {
            try {
                setFavorites(JSON.parse(storedFavorites));
            } catch (e) {
                console.error("Failed to parse favorites", e);
            }
        }
    }, []);

    const toggleFavorite = (appName: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setFavorites((prev) => {
            let newFavorites;
            if (prev.includes(appName)) {
                newFavorites = prev.filter(name => name !== appName);
            } else {
                newFavorites = [...prev, appName];
            }
            localStorage.setItem("kubiverse-favorites", JSON.stringify(newFavorites));
            return newFavorites;
        });
    };

    const { data: applications = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["argocd-applications"],
        queryFn: fetchApplications,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Filter and Group Applications
    const filteredApplications = applications.filter((app) =>
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.project.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedByProject = filteredApplications.reduce((acc, app) => {
        const project = app.project || "default";
        if (!acc[project]) {
            acc[project] = [];
        }
        acc[project].push(app);

        // Additionally add to a virtual "Favoriten" project if favorited
        if (favorites.includes(app.name)) {
            if (!acc["Favoriten"]) {
                acc["Favoriten"] = [];
            }
            // To prevent duplicate references if same app exists
            if (!acc["Favoriten"].some(f => f.name === app.name)) {
                acc["Favoriten"].push(app);
            }
        }

        return acc;
    }, {} as Record<string, ArgoCdApplication[]>);

    const getStatusBadge = (status: string, isSync: boolean = false) => {
        let color = "bg-gray-100 text-gray-800";
        if (status === "Healthy" || status === "Synced") color = "bg-green-100 text-green-800 hover:bg-green-200";
        if (status === "Degraded" || status === "OutOfSync") color = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
        if (status === "Suspended" || status === "Missing") color = "bg-red-100 text-red-800 hover:bg-red-200";

        return <Badge className={`${color} font-medium border-0`}>{status}</Badge>;
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Application Hub</h1>
                        <p className="text-muted-foreground mt-1">Alle aktiven Dienste und deren aktueller Deployment-Zustand.</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Nach Projekt oder Name suchen..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                {isError && (
                    <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center mb-8 border border-red-200">
                        <AlertCircle className="h-5 w-5 mr-3" />
                        <p>Die Applikationen konnten nicht geladen werden. Bitte stellen Sie sicher, dass ArgoCD konfiguriert und erreichbar ist.</p>
                    </div>
                )}

                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i} className="animate-pulse shadow-sm">
                                <CardHeader className="h-20 bg-muted/50" />
                                <CardContent className="h-24 bg-muted/20" />
                            </Card>
                        ))}
                    </div>
                ) : Object.keys(groupedByProject).length === 0 && !isError ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg bg-muted/10">
                        <p className="text-muted-foreground text-lg">Keine Applikationen gefunden.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {Object.entries(groupedByProject)
                            .sort(([a], [b]) => {
                                // "Favoriten" always comes first
                                if (a === "Favoriten") return -1;
                                if (b === "Favoriten") return 1;
                                return a.localeCompare(b);
                            })
                            .map(([project, apps]) => {
                                const pColor = project === "Favoriten" ? { bg: "bg-amber-400", lightBg: "bg-amber-50/50", border: "border-amber-400/30" } : getProjectColor(project);
                                return (
                                    <section key={project} className={`animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 rounded-xl border ${pColor.border} ${pColor.lightBg}`}>
                                        <div className="flex items-center gap-4 mb-6 border-b pb-4">
                                            {project === "Favoriten" ? (
                                                <div className="w-10 h-10 flex items-center justify-center bg-amber-100 rounded-lg text-amber-500">
                                                    <Star className="w-6 h-6 fill-amber-500" />
                                                </div>
                                            ) : (
                                                <img src={kubicon} alt={`${project} logo`} className="w-10 h-10 object-contain drop-shadow-sm" />
                                            )}
                                            <h2 className="text-3xl font-bold tracking-tight text-foreground">
                                                {project.toUpperCase()}
                                            </h2>
                                            <Badge variant="outline" className="ml-2 font-mono text-sm shadow-sm border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300">
                                                {apps.length} Apps
                                            </Badge>
                                        </div>

                                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                            {apps.map((app) => (
                                                <Card key={`${app.project}-${app.name}-${project}`} className="shadow-md hover:shadow-lg transition-all border-t-0 border-x-0 border-b-0 group bg-background overflow-hidden relative border border-border/50">
                                                    <div className={`absolute top-0 left-0 w-full h-1 ${pColor.bg} opacity-80`} />
                                                    <CardHeader className="bg-card pb-4 border-b">
                                                        <CardTitle className="text-xl font-semibold flex justify-between items-start gap-2">
                                                            <span className="truncate group-hover:text-primary transition-colors pr-2" title={app.name}>{app.name}</span>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    onClick={(e) => toggleFavorite(app.name, e)}
                                                                    className="text-slate-400 hover:text-amber-500 transition-colors focus:ring-2 focus:ring-amber-400 rounded-sm outline-none bg-transparent p-2 hover:bg-muted/80 dark:text-slate-500"
                                                                    aria-label="Toggle Favorit"
                                                                >
                                                                    <Star className={`h-4 w-4 ${favorites.includes(app.name) ? "fill-amber-400 text-amber-500" : ""}`} />
                                                                </button>
                                                                <a
                                                                    href={app.argocdUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-slate-600 hover:text-primary transition-colors focus:ring-2 focus:ring-primary rounded-sm outline-none bg-muted/40 p-2 hover:bg-muted/80 dark:text-slate-400"
                                                                    aria-label={`${app.name} in ArgoCD öffnen`}
                                                                >
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </a>
                                                            </div>
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-5 flex flex-col gap-4">
                                                        <div className="flex justify-between items-center text-sm font-medium">
                                                            <span className="text-muted-foreground flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Sync</span>
                                                            {getStatusBadge(app.syncStatus, true)}
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm font-medium">
                                                            <span className="text-muted-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Health</span>
                                                            {getStatusBadge(app.healthStatus)}
                                                        </div>

                                                        {app.externalUrls && app.externalUrls.length > 0 && (
                                                            <div className="pt-3 mt-1 border-t border-border/50 flex flex-col gap-2">
                                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Anwendungen</span>
                                                                {app.externalUrls
                                                                    .filter(url => !url.toLowerCase().includes('/api/'))
                                                                    .map((url, idx) => {
                                                                        let name = url;
                                                                        let isMailpit = false;
                                                                        try {
                                                                            const hostname = new URL(url).hostname;
                                                                            const firstPart = hostname.split('.')[0];

                                                                            if (firstPart.toLowerCase() === 'mailpit' || url.toLowerCase().includes('mailpit')) {
                                                                                name = 'Mailpit';
                                                                                isMailpit = true;
                                                                            } else {
                                                                                name = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
                                                                            }
                                                                        } catch (e) {
                                                                            if (url.toLowerCase().includes('mailpit')) {
                                                                                name = 'Mailpit';
                                                                                isMailpit = true;
                                                                            }
                                                                        }

                                                                        const Icon = isMailpit ? Mail : AppWindow;

                                                                        return (
                                                                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline transition-colors w-full group/link border border-transparent hover:border-border/50 p-1.5 -ml-1.5 rounded-md">
                                                                                <Icon className="h-4 w-4 text-muted-foreground group-hover/link:text-primary transition-colors flex-shrink-0" />
                                                                                <span className="truncate font-medium">{name}</span>
                                                                                <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity ml-auto text-muted-foreground" />
                                                                            </a>
                                                                        );
                                                                    })}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default ArgoCdApplications;
