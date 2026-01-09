import PageMeta from "../../components/common/PageMeta";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import SalesCategoryChart from "../../components/ecommerce/SalesCategorgy";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MiniGraph from "../../components/ecommerce/MiniGraph";

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
          <div className="col-span-8 xl:col-span-2 ">
            <RecentOrders />
          </div>
        </div>

        <div className="col-span-12 space-y-6 xl:col-span-5 ">
          <MiniGraph />
          <DemographicCard />


          <SalesCategoryChart />
        </div>

      </div>
    </>
  );
}
