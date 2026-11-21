function SiteFooter() {
  return (
    <footer className="bg-espresso text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-serif text-lg font-semibold">Anna Flooring</p>
        <p className="text-sm text-white/85">
          <a href="tel:+13135550142" className="hover:text-white">
            (313) 555-0142
          </a>
          <span aria-hidden="true"> · </span>
          <a href="mailto:annajohnson@flooring.com" className="hover:text-white">
            annajohnson@flooring.com
          </a>
          <span aria-hidden="true"> · </span>
          Serving Metro Detroit
        </p>
      </div>
    </footer>
  )
}

export default SiteFooter
