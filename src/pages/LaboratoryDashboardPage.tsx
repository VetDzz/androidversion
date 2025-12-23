import LaboratoryDashboard from '@/components/LaboratoryDashboard';
import VetDashboardMobile from '@/components/VetDashboardMobile';
import SEO from '@/components/SEO';
import PageLayout from '@/components/PageLayout';
import { isAndroidWebView } from '@/utils/platform';

const LaboratoryDashboardPage = () => {
  // Use mobile layout for Android app
  if (isAndroidWebView()) {
    return <VetDashboardMobile />;
  }

  return (
    <PageLayout showFooter={false}>
      <SEO
        title="Tableau de Bord Vétérinaire - Gestion des Consultations"
        description="Interface professionnelle pour gérer les demandes de visite, télécharger les résultats et configurer votre clinique."
        keywords={['tableau de bord vétérinaire', 'gestion consultations', 'visite domicile', 'résultats médicaux']}
      />
      <LaboratoryDashboard />
    </PageLayout>
  );
};

export default LaboratoryDashboardPage;
