import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import FourIsToThree from "../../components/ui/videos/FourIsToThree";
import SixteenIsToNine from "../../components/ui/videos/SixteenIsToNine";

export default function VideoPage() {
  return (
    <div>
      <PageMeta
        title="How To Create SMS Templates"
        description="Learn how to create SMS templates effectively."
      />

      <PageBreadcrumb pageTitle="How To Create SMS Templates" />

      <div className="min-h-auto p-2 rounded-none  bg-white dark:bg-white/3">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-2">
          <ComponentCard title="Creating Templates From Scratch">
            <SixteenIsToNine />
          </ComponentCard>

          <ComponentCard title="Sending Bulky Messages On LucoSMS Platform">
            <FourIsToThree />
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}