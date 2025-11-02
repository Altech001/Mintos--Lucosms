import PageMeta from "../../components/common/PageMeta";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import SalesCategoryChart from "../../components/ecommerce/SalesCategorgy";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";

export default function Home() {
  return (
    <>
      <PageMeta
        title="Luco SMS "
        description="Welcome To The Home Of Marketing Services"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics />

          <StatisticsChart />
          <div className="col-span-10 xl:col-span-2 ">
          <RecentOrders />
        </div>
        </div>

        <div className="col-span-10 space-y-6 xl:col-span-5 ">
          <DemographicCard />

          <SalesCategoryChart />
        </div>

      </div>
    </>
  );
}
