import { FeatureGallery } from "@/components/FeatureGallery";
import { SiteHeader } from "@/components/SiteHeader";

export default async function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center px-6 pb-20 pt-12 text-center sm:pt-20">
        <div className="mt-10 w-full max-w-6xl sm:mt-16">
          <FeatureGallery />
        </div>
      </main>
    </div>
  );
}
