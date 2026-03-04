type BISmaterialRecord = {
  id: string
  name?: string | null
  quantity?: number | null
  category?: string | null
  BISId?: string | null
}

export default function MaterialsTable({
  records,
}: {
  records: BISmaterialRecord[]
}) {
  return (
    <table className="min-w-full border border-gray-300">
      <thead>
        <tr className="bg-gray-100">
          <th className="border px-3 py-2">Name</th>
          <th className="border px-3 py-2">Quantity</th>
          <th className="border px-3 py-2">Category</th>
          <th className="border px-3 py-2">Action</th>
        </tr>
      </thead>

      <tbody>
        {records.map((r) => (
          <tr key={r.id}>
            <td className="border px-3 py-2">{r.name}</td>
            <td className="border px-3 py-2">{r.quantity}</td>
            <td className="border px-3 py-2">{r.category}</td>

            <td className="border px-3 py-2">
              {!r.BISId ? (
                <button className="bg-blue-600 text-white px-3 py-1 rounded">
                  Send to BIS
                </button>
              ) : (
                <button className="bg-green-600 text-white px-3 py-1 rounded">
                  Save in BIS
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}