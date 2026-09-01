/**
 * The element Barba's transitions wipe up and down. It has to exist in the
 * persistent shell rather than inside a page, because it must survive the
 * moment where one page has left and the next has not arrived.
 */
export function Curtain() {
  return (
    <div className="curtain" data-curtain aria-hidden>
      <p className="curtain__label" data-curtain-label />
    </div>
  );
}
