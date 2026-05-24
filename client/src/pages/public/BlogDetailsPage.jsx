import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { api } from "../../lib/api.js";

function normalizeImage(imageValue) {
  if (!imageValue) return "";

  const value = String(imageValue).trim();
  const apiBase = String(import.meta.env.VITE_API_BASE || "").replace(
    /\/api\/?$/,
    "",
  );
  const fallbackBase = "http://localhost:5001";
  const base = apiBase || fallbackBase;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${base}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${base}/${value}`;
  }

  return `${base}/uploads/news/${value}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getCategoryLabel(item) {
  return item?.category || item?.tag || item?.type || "Children";
}

function getAuthorLabel(item) {
  return item?.author || item?.createdBy || "admin";
}

function splitParagraphs(text = "") {
  return String(text)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildSections(text = "") {
  const paragraphs = splitParagraphs(text);

  if (paragraphs.length <= 2) {
    return [
      {
        heading: "Overview",
        body:
          paragraphs[0] ||
          "This article shares useful updates and guidance for parents and children.",
      },
      {
        heading: "Why It Matters",
        body:
          paragraphs[1] ||
          "KidGage helps families discover trusted programs, events, and enriching experiences in one place.",
      },
    ];
  }

  const first = paragraphs[0];
  const middle = paragraphs.slice(1, Math.max(2, paragraphs.length - 1));
  const last = paragraphs[paragraphs.length - 1];

  return [
    { heading: "Overview", body: first },
    {
      heading: "Key Highlights",
      body: middle.join("\n\n"),
    },
    {
      heading: "Final Thoughts",
      body: last,
    },
  ];
}

function getCurrentPageUrl() {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function openShareWindow(url) {
  if (typeof window === "undefined" || !url) return;

  window.open(
    url,
    "_blank",
    "noopener,noreferrer,width=720,height=520,left=120,top=120",
  );
}

function buildShareLinks({ url, title, image, description }) {
  const shareUrl = encodeURIComponent(url || "");
  const shareTitle = encodeURIComponent(title || "KidGage Blog");
  const shareDescription = encodeURIComponent(description || title || "");
  const shareImage = encodeURIComponent(image || "");

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    x: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${shareUrl}&media=${shareImage}&description=${shareDescription}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
  };
}

function SidebarCard({ title, children }) {
  return (
    <div className="rounded-[24px] border border-[rgba(15,23,42,0.06)] bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-[#0f172a]">{title}</h3>
      <div className="mt-4 h-[3px] w-12 rounded-full bg-[#ff8a4d]" />
      <div className="mt-5">{children}</div>
    </div>
  );
}

function ShareButton({ label, title, onClick }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef5ff] text-sm font-bold text-[#1877f2] transition hover:-translate-y-0.5 hover:bg-[#dbeafe] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1877f2]/30"
    >
      {label}
    </button>
  );
}

function LoadingState() {
  return (
    <section className="pb-16">
      <div className="h-[260px] animate-pulse bg-[#6b5cff]" />
      <div className="container-main -mt-10">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <div className="space-y-6">
            <div className="h-[160px] animate-pulse rounded-[24px] bg-white" />
            <div className="h-[260px] animate-pulse rounded-[24px] bg-white" />
            <div className="h-[220px] animate-pulse rounded-[24px] bg-white" />
          </div>

          <div className="overflow-hidden rounded-[28px] bg-white shadow-sm">
            <div className="h-[340px] animate-pulse bg-slate-100" />
            <div className="p-8">
              <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 h-12 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="mt-8 h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-4 w-11/12 animate-pulse rounded bg-slate-100" />
              <div className="mt-3 h-4 w-10/12 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function BlogDetailsPage() {
  const { slug } = useParams();

  const [blog, setBlog] = useState(null);
  const [allBlogs, setAllBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBlog() {
      try {
        setLoading(true);
        setNotFound(false);

        const [blogRes, blogsRes] = await Promise.all([
          api.get(`/public/blogs/${slug}`),
          api.get("/public/blogs"),
        ]);

        if (!active) return;

        const item = blogRes?.data?.blog || null;
        const blogsRows = Array.isArray(blogsRes?.data?.blogs)
          ? blogsRes.data.blogs
          : [];

        if (!item) {
          setNotFound(true);
          return;
        }

        setBlog(item);
        setAllBlogs(blogsRows);
      } catch (error) {
        if (!active) return;

        if (error?.response?.status === 404) {
          setNotFound(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (slug) loadBlog();

    return () => {
      active = false;
    };
  }, [slug]);

  const image = useMemo(
    () =>
      normalizeImage(blog?.image || blog?.thumbnail || blog?.coverImage || ""),
    [blog],
  );

  const author = getAuthorLabel(blog);
  const category = getCategoryLabel(blog);
  const date = formatDate(blog?.date || blog?.createdAt);

  const articleSections = useMemo(
    () => buildSections(blog?.description || blog?.excerpt || ""),
    [blog],
  );

  const shareLinks = useMemo(() => {
    return buildShareLinks({
      url: getCurrentPageUrl(),
      title: blog?.title || "KidGage Blog",
      image,
      description: blog?.description || blog?.excerpt || blog?.title || "",
    });
  }, [blog, image]);

  const filteredRecentPosts = useMemo(() => {
    const q = search.trim().toLowerCase();

    const rows = allBlogs.filter(
      (item) =>
        String(item?._id || item?.id || item?.slug || "") !==
        String(blog?._id || blog?.id || blog?.slug || ""),
    );

    if (!q) return rows.slice(0, 4);

    return rows
      .filter((item) => {
        const title = String(item?.title || "").toLowerCase();
        const description = String(
          item?.description || item?.excerpt || "",
        ).toLowerCase();

        return title.includes(q) || description.includes(q);
      })
      .slice(0, 4);
  }, [allBlogs, blog, search]);

  const categories = useMemo(() => {
    const map = new Map();

    allBlogs.forEach((item) => {
      const key = getCategoryLabel(item);
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }, [allBlogs]);

  const tags = useMemo(() => {
    const set = new Set(
      allBlogs.map((item) => getCategoryLabel(item)).filter(Boolean),
    );

    return Array.from(set).slice(0, 6);
  }, [allBlogs]);

  if (notFound) {
    return <Navigate to="/blogs" replace />;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!blog) return null;

  return (
    <section className="pb-16">
      <div className="relative overflow-hidden bg-[#6b5cff] pb-20 pt-14 text-white md:pb-24 md:pt-20">
        <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute left-10 top-20 text-4xl opacity-60">✿</div>
        <div className="absolute right-10 top-24 text-6xl opacity-70">🎈</div>
        <div className="absolute right-16 bottom-16 text-5xl opacity-70">
          🪁
        </div>

        <div className="container-main relative z-10">
          <div className="mx-auto max-w-[980px] text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-[#ff7a3d] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
              <Link to="/" className="hover:opacity-90">
                Home
              </Link>
              <span>/</span>
              <Link to="/blogs" className="hover:opacity-90">
                Blogs
              </Link>
              <span>/</span>
              <span>{category}</span>
              <span>/</span>
              <span className="max-w-[280px] truncate">{blog.title}</span>
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight md:text-6xl">
              {blog.title || "Blog Details"}
            </h1>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-12 bg-[radial-gradient(circle_at_20px_-2px,white_22px,transparent_23px)] bg-[length:60px_60px] bg-repeat-x" />
      </div>

      <div className="container-main relative z-20 -mt-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-6">
            <SidebarCard title="Search">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search here..."
                  className="h-[52px] w-full rounded-[16px] border border-slate-200 bg-[#f8fbff] px-4 pr-11 text-sm text-[#0f172a] outline-none transition placeholder:text-slate-400 focus:border-[#1877f2] focus:bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>
              </div>
            </SidebarCard>

            <SidebarCard title="Recent Posts">
              <div className="space-y-4">
                {filteredRecentPosts.length > 0 ? (
                  filteredRecentPosts.map((item) => {
                    const itemImage = normalizeImage(
                      item?.image || item?.thumbnail || item?.coverImage || "",
                    );

                    return (
                      <Link
                        key={item?._id || item?.id || item?.slug}
                        to={`/blogs/${item?.slug || item?._id || item?.id}`}
                        className="flex gap-3 rounded-[16px] transition hover:bg-slate-50"
                      >
                        <div className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[12px] bg-slate-100">
                          {itemImage ? (
                            <img
                              src={itemImage}
                              alt={item?.title || "Post"}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-medium text-[#ff7a3d]">
                            🗓 {formatDate(item?.date || item?.createdAt)}
                          </div>
                          <div className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-[#0f172a]">
                            {item?.title || "Untitled Blog"}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="text-sm text-slate-500">
                    No matching posts found.
                  </div>
                )}
              </div>
            </SidebarCard>

            <SidebarCard title="Categories">
              <div className="space-y-3">
                {categories.length > 0 ? (
                  categories.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-[14px] border border-slate-200 px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-[#475569]">
                        {item.name}
                      </span>
                      <span className="font-bold text-[#0f172a]">
                        ({item.count})
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No categories</div>
                )}
              </div>
            </SidebarCard>

            <SidebarCard title="Tags">
              <div className="flex flex-wrap gap-2">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-[12px] border border-slate-200 px-3 py-2 text-xs font-medium text-[#475569]"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">No tags</div>
                )}
              </div>
            </SidebarCard>
          </aside>

          <article className="rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-white p-5 shadow-sm md:p-6 lg:p-8">
            <div className="overflow-hidden rounded-[24px] bg-slate-100">
              {image ? (
                <img
                  src={image}
                  alt={blog.title || "Blog"}
                  className="h-[260px] w-full object-cover md:h-[420px]"
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center text-slate-400 md:h-[420px]">
                  No Image
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-[#64748b]">
              <div className="flex items-center gap-2">
                <span className="text-[#ff7a3d]">👤</span>
                <span>{author}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#ff7a3d]">🗓</span>
                <span>{date || "Latest Update"}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#ff7a3d]">🏷</span>
                <span>{category}</span>
              </div>
            </div>

            <h2 className="mt-5 text-3xl font-black leading-tight text-[#0f172a] md:text-5xl">
              {blog.title}
            </h2>

            <div className="mt-5 space-y-8 text-[16px] leading-8 text-[#64748b]">
              {articleSections.map((section, index) => (
                <div key={`${section.heading}-${index}`}>
                  <h3 className="mb-3 text-2xl font-black text-[#0f172a]">
                    {section.heading}
                  </h3>
                  <div className="whitespace-pre-line">{section.body}</div>

                  {index === 1 ? (
                    <div className="mt-6 rounded-[18px] bg-[#ff7a3d] px-5 py-5 text-white shadow-sm">
                      <p className="text-sm italic leading-7 md:text-base">
                        Parents and educators can create better learning
                        experiences when routines, creativity, and joyful
                        exploration are part of everyday childhood.
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-[#0f172a]">
                  Tags:
                </span>
                <span className="rounded-[12px] border border-slate-200 px-3 py-2 text-xs font-medium text-[#475569]">
                  {category}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#0f172a]">
                  Share:
                </span>

                <ShareButton
                  label="f"
                  title="Share on Facebook"
                  onClick={() => openShareWindow(shareLinks.facebook)}
                />

                <ShareButton
                  label="x"
                  title="Share on X"
                  onClick={() => openShareWindow(shareLinks.x)}
                />

                <ShareButton
                  label="p"
                  title="Share on Pinterest"
                  onClick={() => openShareWindow(shareLinks.pinterest)}
                />

                <ShareButton
                  label="in"
                  title="Share on LinkedIn"
                  onClick={() => openShareWindow(shareLinks.linkedin)}
                />
              </div>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-8">
              <h3 className="text-2xl font-black text-[#0f172a]">
                Leave A Comment
              </h3>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Name"
                  className="h-[54px] rounded-[14px] border border-slate-200 px-4 text-sm outline-none transition focus:border-[#1877f2]"
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="h-[54px] rounded-[14px] border border-slate-200 px-4 text-sm outline-none transition focus:border-[#1877f2]"
                />
              </div>

              <textarea
                rows={7}
                placeholder="Message"
                className="mt-4 w-full rounded-[14px] border border-slate-200 px-4 py-4 text-sm outline-none transition focus:border-[#1877f2]"
              />

              <label className="mt-4 flex items-center gap-3 text-sm text-[#64748b]">
                <input type="checkbox" className="rounded border-slate-300" />
                Save my name, email, and website in this browser for the next
                time I comment.
              </label>

              <div className="mt-6 text-sm text-[#64748b]">Star rating:</div>

              <button
                type="button"
                className="mt-5 rounded-[12px] bg-[#ff7a3d] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#ea580c]"
              >
                Send Comments
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
