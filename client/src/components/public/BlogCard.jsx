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
    month: "long",
    year: "numeric",
  });
}

function getCategoryLabel(item) {
  return item?.category || item?.tag || item?.type || "KidGage";
}

function getAuthorLabel(item) {
  return item?.author || item?.createdBy || "admin";
}

export function BlogCard({ item }) {
  const slug = item?.slug || item?._id || item?.id || "#";
  const title = item?.title || "Untitled Blog";
  const excerpt =
    item?.excerpt ||
    item?.description ||
    "Latest updates, insights, and stories for kids and parents.";

  const image = normalizeImage(
    item?.image || item?.thumbnail || item?.coverImage || "",
  );

  const date = formatDate(item?.date || item?.createdAt);
  const category = getCategoryLabel(item);
  const author = getAuthorLabel(item);

  return (
    <Link
      to={`/blogs/${slug}`}
      className="group block h-full overflow-hidden rounded-[30px] border border-[rgba(15,23,42,0.10)] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.10)]"
    >
      <div className="overflow-hidden rounded-t-[30px] bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-[250px] w-full object-cover transition duration-500 group-hover:scale-[1.04] md:h-[280px] xl:h-[300px]"
          />
        ) : (
          <div className="flex h-[250px] w-full items-center justify-center bg-slate-100 text-slate-400 md:h-[280px] xl:h-[300px]">
            No Image
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="inline-flex rounded-full bg-[#6b5cff] px-5 py-2 text-sm font-semibold text-white shadow-sm">
          {category}
        </div>

        <h3 className="mt-5 line-clamp-2 text-[28px] font-black leading-[1.25] tracking-tight text-[#0b1021]">
          {title}
        </h3>

        <p className="mt-4 line-clamp-2 text-[16px] leading-8 text-[#5f6b7a]">
          {excerpt}
        </p>

        <div className="mt-6 border-t-2 border-dashed border-[#ffb37b]" />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm text-[#5f6b7a]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef5ff] text-xs font-bold uppercase text-[#1877f2]">
              {String(author).charAt(0)}
            </span>
            <span className="text-[15px] font-medium text-[#0b1021]">
              {author}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#f97316]">🗓</span>
            <span className="text-[15px] font-medium">
              {date || "Latest Update"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
