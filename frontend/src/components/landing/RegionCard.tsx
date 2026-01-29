import { Region } from '@/types';
import { cn } from '@/lib/utils';
import { MapPin, Building2 } from 'lucide-react';

interface RegionCardProps {
  region: Region;
  isSelected: boolean;
  onClick: () => void;
}

const REGION_CONFIG: Record<Region, { name: string; icon: typeof MapPin; description: string }> = {
  russia: {
    name: 'Russia Document',
    icon: Building2,
    description: 'Access Russian shipment documents and logistics data',
  },
  dubai: {
    name: 'Dubai Document',
    icon: MapPin,
    description: 'Access Dubai shipment documents and logistics data',
  },
};

export function RegionCard({ region, isSelected, onClick }: RegionCardProps) {
  const config = REGION_CONFIG[region];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full p-8 rounded-xl border-2 transition-all duration-300 text-left group',
        'bg-card hover:shadow-lg',
        isSelected
          ? 'border-accent shadow-lg bg-accent/5'
          : 'border-border hover:border-accent/50'
      )}
    >
      <div
        className={cn(
          'absolute top-4 right-4 w-4 h-4 rounded-full border-2 transition-all duration-200',
          isSelected
            ? 'border-accent bg-accent'
            : 'border-muted-foreground'
        )}
      >
        {isSelected && (
          <div className="absolute inset-1 bg-accent-foreground rounded-full" />
        )}
      </div>

      <div
        className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300',
          isSelected
            ? 'bg-accent text-accent-foreground'
            : 'bg-secondary text-muted-foreground group-hover:bg-accent/20 group-hover:text-accent'
        )}
      >
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-display font-semibold mb-2 text-foreground">
        {config.name}
      </h3>
      
      <p className="text-sm text-muted-foreground">
        {config.description}
      </p>
    </button>
  );
}
