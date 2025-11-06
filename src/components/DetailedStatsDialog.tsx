import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MuscleStats {
  category: string;
  count: number;
  percentage: number;
}

interface DetailedStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  muscleStats: MuscleStats[];
  totalWorkouts: number;
}

const MUSCLE_COLORS = {
  chest: "#FF6384",
  back: "#36A2EB",
  legs: "#FFCE56",
  shoulders: "#4BC0C0",
  arms: "#9966FF",
  core: "#FF9F40",
};

export const DetailedStatsDialog = ({ 
  open, 
  onOpenChange, 
  muscleStats,
  totalWorkouts 
}: DetailedStatsDialogProps) => {
  const getMuscleLabel = (category: string) => {
    const labels: Record<string, string> = {
      chest: "Pectoraux",
      back: "Dos",
      legs: "Jambes",
      shoulders: "Épaules",
      arms: "Bras",
      core: "Abdos",
    };
    return labels[category] || category;
  };

  const chartData = muscleStats.map(stat => ({
    name: getMuscleLabel(stat.category),
    séances: stat.count,
    percentage: stat.percentage,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card w-screen h-screen max-w-none max-h-none m-0 rounded-none overflow-y-auto left-0 top-0 translate-x-0 translate-y-0 [&>button]:hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pt-12 pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-lg">Statistiques détaillées</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-4 pb-20">
          {/* Résumé général */}
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Résumé de vos entraînements</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total séances</p>
                <p className="text-3xl font-bold text-primary">{totalWorkouts}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Muscles travaillés</p>
                <p className="text-3xl font-bold text-primary">{muscleStats.length}</p>
              </div>
            </div>
          </Card>

          {/* Graphique en barres */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Répartition par muscle</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Séances', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => [value, 'Séances']}
                />
                <Line 
                  type="monotone" 
                  dataKey="séances" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Détails par muscle */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Détails par groupe musculaire</h3>
            {muscleStats.map((stat) => {
              const color = MUSCLE_COLORS[stat.category as keyof typeof MUSCLE_COLORS] || "#999";
              return (
                <Card key={stat.category} className="p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className="w-6 h-6 rounded-lg"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-base">{getMuscleLabel(stat.category)}</h4>
                      <p className="text-sm text-muted-foreground">
                        {stat.count} séances • {stat.percentage}% du total
                      </p>
                    </div>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Fréquence</span>
                      <span>{stat.percentage}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${stat.percentage}%`,
                          backgroundColor: color 
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Séances</p>
                      <p className="text-xl font-bold">{stat.count}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Pourcentage</p>
                      <p className="text-xl font-bold">{stat.percentage}%</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Message motivant */}
          <Card className="p-6 bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
            <p className="text-center text-sm font-medium">
              💪 Continue comme ça ! Garde un équilibre entre tous les groupes musculaires pour un développement harmonieux.
            </p>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
