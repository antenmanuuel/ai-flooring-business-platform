import { money } from '../requestHelpers'

// "12 × 15 ft" when the client gave length and width, otherwise "Total area".
const roomSize = (room) => (room.length && room.width ? `${Number(room.length)} × ${Number(room.width)} ft` : 'Total area')

// The rooms of a quote request. Used on Anna's Quotes page and the client's project page.
function RequestRoomsTable({ rooms, totalArea }) {
  return (
    <div className="overflow-x-auto rounded-md bg-sand/60">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="text-xs tracking-wide text-muted uppercase">
          <tr>
            <th className="px-4 py-2.5 font-medium">Room</th>
            <th className="px-4 py-2.5 font-medium">Flooring</th>
            <th className="px-4 py-2.5 font-medium">Size</th>
            <th className="px-4 py-2.5 font-medium">Current floor</th>
            <th className="px-4 py-2.5 font-medium">Pattern</th>
            <th className="px-4 py-2.5 text-right font-medium">Area</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="border-t border-line/70 align-top">
              <td className="px-4 py-2.5 font-medium">{room.name}</td>
              <td className="px-4 py-2.5">
                {room.productName}
                <span className="block text-xs text-muted">
                  {money.format(room.unitPrice)}/{room.pricingUnit}
                </span>
              </td>
              <td className="px-4 py-2.5">{roomSize(room)}</td>
              <td className="px-4 py-2.5">
                {room.currentFlooring || '—'}
                {room.removeExisting && <span className="block text-xs text-copper">Remove existing</span>}
              </td>
              <td className="px-4 py-2.5">{room.pattern}</td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap">{room.area.toLocaleString('en-US')} sq ft</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line font-medium">
            <td className="px-4 py-2.5" colSpan={5}>
              {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
            </td>
            <td className="px-4 py-2.5 text-right whitespace-nowrap">{totalArea.toLocaleString('en-US')} sq ft</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default RequestRoomsTable
