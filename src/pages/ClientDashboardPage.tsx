import ClientDashboard from '@/components/ClientDashboard';
import ClientDashboardMobile from '@/components/ClientDashboardMobile';
import PageLayout from '@/components/PageLayout';
import SEO from '@/components/SEO';
import { isAndroidWebView } from '@/utils/platform';

const ClientDashboardPage = () => {
  // Use mobile layout for Android app
  if (isAndroidWebView()) {
    return <ClientDashboardMobile />;
  }

  return (
    <PageLayout showFooter={false}>
      <SEO
        title="Espace Client - Laboratoire d'Analyses Médicales"
        description="Gérez vos rendez-vous, consultez vos résultats d'analyses et trouvez des laboratoires près de chez vous."
        keywords={['espace client', 'résultats analyses', 'rendez-vous laboratoire', 'analyses médicales']}
      />
      <ClientDashboard />
    </PageLayout>
  );
};

export default ClientDashboardPage;
