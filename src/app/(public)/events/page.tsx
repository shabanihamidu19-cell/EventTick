"use client";

import { useEffect, useState } from "react";
import { EventCard } from "@/components/events/event-card";
import { Input } from "@/components/ui/input";
import { CITIES, CATEGORIES, type EventCard as EventCardType } from "@/types";
import { Search } from "lucide-react";

export default function EventsPage() {
  const [events, setEvents] = useState<EventCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    params.set("status", "UPCOMING,LIVE");

    setLoading(true);
    fetch(`/api/events?${params}`)
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .finally(() => setLoading(false));
  }, [search, city, category]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">All Events</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-muted/40 animate-pulse aspect-[4/5]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((e, i) => (
            <EventCard key={e.id} event={e} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
