export default function PlaceholderPage({ title = "Page" }) {
  return (
    <section className="container-main py-12">
      <div className="rounded-[24px] bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-black">{title}</h1>
        <p className="mt-3 text-textdark/75">This page is scaffolded and ready for the next implementation pass.</p>
      </div>
    </section>
  );
}
