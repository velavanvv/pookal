export default function SectionCard({ title, description, children }) {
  return (
    <section className="card border-0 shadow-sm h-100">
      <div className="card-body">
        <div className="mb-3">
          <h3 className="h5 mb-1">{title}</h3>
          <p className="text-muted mb-0">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
