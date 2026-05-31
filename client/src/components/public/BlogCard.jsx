import { Link } from "react-router-dom";

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
    month: "short",
    year: "numeric",
  });
}

function getCategoryLabel(item) {
  return item?.category || item?.tag || item?.type || "KidGage";
}

function getAuthorLabel(item) {
  return item?.author || item?.createdBy || "Admin";
}

function getInitials(name) {
  const text = String(name || "A").trim();

  if (!text) return "A";

  const parts = text.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

export function BlogCard({ item }) {
  const slug = item?.slug || item?._id || item?.id || "#";
  const title = item?.title || "Untitled Blog";

  const excerpt =
    item?.excerpt ||
    item?.description ||
    "Latest updates, insights, and stories for kids, parents, and academies.";

  const image = normalizeImage(
    item?.image || item?.thumbnail || item?.coverImage || "",
  );

  const date = formatDate(item?.date || item?.createdAt);
  const category = getCategoryLabel(item);
  const author = getAuthorLabel(item);

  return (
    <Link
      to={`/blogs/${slug}`}
      className="group relative block h-full overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_24px_60px_rgba(236,122,59,0.18)]"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-white">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-[230px] w-full object-cover transition duration-700 group-hover:scale-105 sm:h-[250px] lg:h-[270px]"
          />
        ) : (
          <div className="flex h-[230px] w-full items-center justify-center bg-gradient-to-br from-orange-50 via-yellow-50 to-white sm:h-[250px] lg:h-[270px]">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl shadow-sm">
                🧒
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-400">
                No Image Available
              </p>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-70 transition duration-300 group-hover:opacity-60" />

        <div className="absolute left-5 top-5">
          <span className="inline-flex max-w-[190px] items-center rounded-full bg-white/95 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#ec7a3b] shadow-sm backdrop-blur">
            <span className="mr-2 h-2 w-2 rounded-full bg-[#ffd84d]" />
            <span className="truncate">{category}</span>
          </span>
        </div>

        <div className="absolute bottom-5 right-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#ec7a3b] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/25">
            <span>🗓</span>
            <span>{date || "Latest"}</span>
          </span>
        </div>
      </div>

      <div className="relative p-5 sm:p-6">
        <div className="absolute -top-7 left-6 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-[#ec7a3b] to-[#ff9f5a] text-sm font-black text-white shadow-lg shadow-orange-500/25">
          {getInitials(author)}
        </div>

        <div className="pl-[72px]">
          <p className="text-sm font-bold text-slate-500">
            Posted by{" "}
            <span className="text-[#0b1021]">
              {author}
            </span>
          </p>
        </div>

        <h3 className="mt-6 line-clamp-2 text-[22px] font-black leading-tight tracking-tight text-[#0b1021] transition duration-300 group-hover:text-[#ec7a3b] sm:text-[24px] lg:text-[26px]">
          {title}
        </h3>

        <p className="mt-4 line-clamp-3 text-[15px] leading-7 text-slate-600">
          {excerpt}
        </p>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-dashed border-orange-200 pt-5">
          <span className="inline-flex items-center gap-2 text-sm font-black text-[#ec7a3b]">
            Read Article
            <span className="transition duration-300 group-hover:translate-x-1">
              →
            </span>
          </span>

          <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-500">
            KidGage Blog
          </span>
        </div>
      </div>
    </Link>
  );
}