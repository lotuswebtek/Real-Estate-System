import type { Metadata } from "next";
import { SearchExperience } from "@/components/search/search-experience";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return <SearchExperience />;
}
