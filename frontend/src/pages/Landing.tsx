import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { RegionCard } from '@/components/landing/RegionCard';
import { LoginForm } from '@/components/landing/LoginForm';
import { Region } from '@/types';
import { FileText, Shield, Globe, Database } from 'lucide-react';

export default function Landing() {
  const { selectedRegion, setSelectedRegion } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const handleRegionSelect = (region: Region) => {
    setSelectedRegion(region);
  };

  const handleContinue = () => {
    if (selectedRegion) {
      setShowLogin(true);
    }
  };

  const handleBack = () => {
    setShowLogin(false);
    setSelectedRegion(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/10 rounded-full blur-3xl opacity-50" />

        <div className="container mx-auto px-6 py-16 relative">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              BoraDoc <span className="text-accent">Vault</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Centralized shipment document storage and retrieval system for secure management of logistics documentation
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
            {[
              { icon: Database, title: 'Region Isolation', desc: 'Separate databases for each region' },
              { icon: Shield, title: 'Secure Storage', desc: 'Enterprise-grade document security' },
              { icon: Globe, title: 'Multi-Region', desc: 'Russia & Dubai support' },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="card-elevated p-6 text-center animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Login Section */}
          <div className="max-w-2xl mx-auto">
            {showLogin && selectedRegion ? (
              <LoginForm region={selectedRegion} onBack={handleBack} />
            ) : (
              <div className="animate-scale-in">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
                    Select Your Region
                  </h2>
                  <p className="text-muted-foreground">
                    Choose the region to access its document database
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <RegionCard
                    region="russia"
                    isSelected={selectedRegion === 'russia'}
                    onClick={() => handleRegionSelect('russia')}
                  />
                  <RegionCard
                    region="dubai"
                    isSelected={selectedRegion === 'dubai'}
                    onClick={() => handleRegionSelect('dubai')}
                  />
                </div>

                <div className="text-center">
                  <button
                    onClick={handleContinue}
                    disabled={!selectedRegion}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-accent text-accent-foreground font-medium transition-all duration-300 hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    Continue to Login
                    <span className="text-lg">→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2026 BoraDoc Vault. Shipment Document Management System.</p>
        </div>
      </footer>
    </div>
  );
}
