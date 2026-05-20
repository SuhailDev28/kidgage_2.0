import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { BlogCard } from "../../components/public/BlogCard.jsx";

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="h-[240px] animate-pulse bg-slate-100 md:h-[280px] xl:h-[320px]" />
      <div className="p-6">
        <div className="h-6 w-28 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-8 w-4/5 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-3 h-8 w-3/5 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-5 h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-4 w-9/12 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState([]);
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBlogs() {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/public/blogs");
        if (!active) return;

        const rows = Array.isArray(res?.data?.blogs)
          ? res.data.blogs
          : Array.isArray(res?.data)
            ? res.data
            : [];

        setBlogs(rows);
        setFilteredBlogs(rows);
      } catch {
        if (!active) return;
        setError("Unable to load blogs right now.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBlogs();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      setFilteredBlogs(blogs);
      return;
    }

    const next = blogs.filter((item) => {
      const title = String(item?.title || "").toLowerCase();
      const excerpt = String(
        item?.excerpt || item?.description || "",
      ).toLowerCase();

      return title.includes(q) || excerpt.includes(q);
    });

    setFilteredBlogs(next);
  }, [query, blogs]);

  return (
    <div className="pb-16">
      <section className="container-main mt-8">
        <div className="relative overflow-hidden rounded-[38px] bg-[#fff7e8] px-6 py-10 shadow-sm md:px-10 md:py-14">
          <div className="absolute -left-10 top-12 h-28 w-28 rounded-[32px] bg-[#ffd44d]" />
          <div className="absolute right-[-14px] top-[-10px] h-36 w-36 rounded-[40px] bg-[#6b5cff]" />
          <div className="absolute bottom-[-12px] right-[20%] h-24 w-24 rounded-full bg-[#ff8a4d]" />

          <div className="relative max-w-[760px]">
            <div className="inline-flex rounded-full bg-[#6b5cff] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white">
              KidGage News
            </div>

            <h1 className="mt-5 text-4xl font-black leading-[1.03] tracking-tight text-[#111827] md:text-6xl">
              Stories, updates and ideas for parents and kids
            </h1>

            <p className="mt-5 max-w-[620px] text-base leading-8 text-[#5b6474] md:text-lg">
              Explore the latest KidGage articles, platform updates, academy
              highlights, and family-friendly insights all in one place.
            </p>
          </div>
        </div>
      </section>

      <section className="container-main mt-10">
        <div className="rounded-[34px] bg-white px-6 py-8 shadow-sm md:px-8 md:py-10">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[720px]">
              <div className="inline-flex rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#1877f2]">
                Latest Articles
              </div>

              <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#0f172a] md:text-5xl">
                Read our recent blogs
              </h2>

              <p className="mt-3 max-w-[620px] text-base leading-8 text-[#64748b] md:text-lg">
                Browse fresh articles and updates published for the KidGage
                community.
              </p>
            </div>

            <div className="w-full max-w-[420px]">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search blogs..."
                className="h-[56px] w-full rounded-full border border-[rgba(15,23,42,0.08)] bg-[#f8fbff] px-5 text-sm text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#1877f2] focus:bg-white"
              />
            </div>
          </div>

          {error ? (
            <div className="mb-6 rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : filteredBlogs.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredBlogs.map((item) => (
                <BlogCard key={item._id || item.id || item.slug} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No blog posts found"
              subtitle="Try changing your search text or check back later for new updates."
            />
          )}
        </div>
      </section>
    </div>
  );
}
