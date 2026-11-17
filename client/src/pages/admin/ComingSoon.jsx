// Stand-in for admin sections that haven't been built yet.
function ComingSoon({ title }) {
  return (
    <>
      <h1 className="font-serif text-4xl font-medium">{title}</h1>
      <p className="mt-1 text-muted">This section is coming soon.</p>
    </>
  )
}

export default ComingSoon
