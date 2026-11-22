import { getResumeList } from "@/actions/profile.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { DiscoveryBoard } from "@/components/discovery/DiscoveryBoard";
import { getDiscoveryListings, getDiscoveryWatches } from "@/actions/discovery.actions";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("discovery.title") };
}

export default async function DiscoverPage() {
  const [listings, watches, resumes] = await Promise.all([getDiscoveryListings(), getDiscoveryWatches(), getResumeList(1, APP_CONSTANTS.RESUME_PICKER_LIMIT)]);
  return <DiscoveryBoard initialData={listings} initialWatches={watches} resumes={resumes?.success ? resumes.data?.map((r: { id: string; title: string }) => ({ id: r.id, title: r.title })) ?? [] : []} />;
}
