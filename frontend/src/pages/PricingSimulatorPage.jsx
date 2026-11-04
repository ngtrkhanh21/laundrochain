import { useLocation } from 'react-router-dom';
import PriceFloorConfigSection from '../components/PriceFloorConfigSection';
import PricingRulesSection from '../components/PricingRulesSection';
import VouchersSection from '../components/VouchersSection';

export default function PricingSimulatorPage() {
  const location = useLocation();
  const path = location?.pathname || '';

  if (path.includes('voucher')) {
    return (
      <div className="max-w-7xl mx-auto pb-12 animate-fade-in">
        <VouchersSection />
      </div>
    );
  }

  if (path.includes('floor') || path.includes('pricing-config')) {
    return (
      <div className="max-w-7xl mx-auto pb-12 animate-fade-in">
        <PriceFloorConfigSection />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in">
      <PricingRulesSection />
    </div>
  );
}
