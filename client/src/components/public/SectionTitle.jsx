export function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-4xl font-black text-textdark">{title}</h2>
      {subtitle ? <p className="mt-1 text-textdark/75">{subtitle}</p> : null}
    </div>
  );
}
