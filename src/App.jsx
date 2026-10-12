import { useEffect, useMemo, useState } from "react";
import { CITIES, searchFlights } from "./data";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api/bookings";

function today() {
  return new Date().toISOString().slice(0, 10);
}
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const hm = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;
const cityName = (code) => CITIES.find((c) => c.code === code)?.name ?? code;

const AIRLINE_COLORS = {
  IndiGo: "#2b3a8c",
  "Air India": "#d6232a",
  Vistara: "#6b2d5c",
  SpiceJet: "#e8590c",
  "Akasa Air": "#f08c00",
};

const POPULAR = [
  { from: "BOM", to: "DEL", emoji: "🏙️", price: "₹3,200" },
  { from: "DEL", to: "GOI", emoji: "🏖️", price: "₹4,100" },
  { from: "BLR", to: "HYD", emoji: "🌆", price: "₹2,600" },
  { from: "BOM", to: "BLR", emoji: "🌴", price: "₹3,000" },
];

export default function App() {
  const [tab, setTab] = useState("search");
  const [form, setForm] = useState({
    from: "BOM",
    to: "DEL",
    date: today(),
    passengers: 1,
  });
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [sortBy, setSortBy] = useState("price");
  const [nonStop, setNonStop] = useState(false);
  const [airlineFilter, setAirlineFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");

  const fetchBookings = async () => {
    try {
      const response = await fetch(API_BASE_URL);
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const runSearch = (f) => {
    if (f.from === f.to) {
      setError("Origin aur destination alag hone chahiye.");
      return;
    }
    setError("");
    setAirlineFilter("All");
    setSearching(true);
    setResults(null);
    setTimeout(() => {
      setResults(searchFlights(f.from, f.to, f.date));
      setSearching(false);
    }, 700);
  };

  const onSearch = (e) => {
    e.preventDefault();
    runSearch(form);
  };

  const pickPopular = (p) => {
    const next = { ...form, from: p.from, to: p.to };
    setForm(next);
    runSearch(next);
  };

  const swap = () => setForm({ ...form, from: form.to, to: form.from });

  const airlines = useMemo(
    () => (results ? ["All", ...new Set(results.map((f) => f.airline))] : []),
    [results]
  );

  const cheapestId = useMemo(
    () => results && [...results].sort((a, b) => a.price - b.price)[0]?.id,
    [results]
  );

  const fastestId = useMemo(
    () => results && [...results].sort((a, b) => a.duration - b.duration)[0]?.id,
    [results]
  );

  const visible = useMemo(() => {
    if (!results) return [];
    return results
      .filter((f) => (nonStop ? f.stops === 0 : true))
      .filter((f) => (airlineFilter === "All" ? true : f.airline === airlineFilter))
      .sort((a, b) =>
        sortBy === "price"
          ? a.price - b.price
          : sortBy === "duration"
          ? a.duration - b.duration
          : a.departure.localeCompare(b.departure)
      );
  }, [results, nonStop, airlineFilter, sortBy]);

  // Backend ko flat payload bhejna hai (yahi maang raha hai)
  const book = async (passengerInfo) => {
    const pax = Number(form.passengers);
    const bookingPayload = {
      id: "FF" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      flightId: selected.id,
      airline: selected.airline,
      flightNumber: selected.number,
      origin: selected.from,
      destination: selected.to,
      travelDate: selected.date,
      departure: selected.departure,
      arrival: selected.arrival,
      durationMin: selected.duration,
      stops: selected.stops,
      price: selected.price,
      passengers: pax,
      total: selected.price * pax,
      ...passengerInfo,
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      if (response.ok) {
        const savedBooking = await response.json();
        setSelected(null);
        setConfirmation(savedBooking || bookingPayload);
        fetchBookings();
      } else {
        const msg = await response.text();
        console.error("Booking failed:", response.status, msg);
        alert("Booking database mein save nahi ho payi.\n" + msg);
      }
    } catch (err) {
      console.error("API Error:", err);
      alert("Backend API connection failure!");
    }
  };

  const cancel = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setBookings(bookings.filter((b) => b.id !== id));
      } else {
        fetchBookings();
      }
    } catch (err) {
      console.error("Cancel failed:", err);
      setBookings(bookings.filter((b) => b.id !== id));
    }
  };

  return (
    <div className="app">
      <header className="nav">
        <div className="brand">
          <span className="logo">✈</span>
          <span>
            Flight<b>Finder</b>
          </span>
        </div>
        <nav>
          <button className={tab === "search" ? "active" : ""} onClick={() => setTab("search")}>
            Search
          </button>
          <button className={tab === "bookings" ? "active" : ""} onClick={() => setTab("bookings")}>
            My Bookings
            {bookings.length > 0 && <span className="pill">{bookings.length}</span>}
          </button>
        </nav>
      </header>

      {tab === "search" && (
        <>
          <section className="hero">
            <div className="clouds" aria-hidden="true">
              <span>☁</span>
              <span>☁</span>
              <span>☁</span>
            </div>
            <h2>
              <em>Book your flight with ease and comfort!</em>
            </h2>
            <p>Book your flight with ease and comfort!</p>

            <form className="search" onSubmit={onSearch}>
              <label>
                <span>From</span>
                <select value={form.from} onChange={update("from")}>
                  {CITIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="swap" onClick={swap} aria-label="Swap">
                ⇄
              </button>
              <label>
                <span>To</span>
                <select value={form.to} onChange={update("to")}>
                  {CITIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Date</span>
                <input type="date" min={today()} value={form.date} onChange={update("date")} required />
              </label>
              <label>
                <span>Passengers</span>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={form.passengers}
                  onChange={update("passengers")}
                />
              </label>
              <button className="primary big" type="submit">
                Search flights
              </button>
              {error && <p className="error">{error}</p>}
            </form>
          </section>

          <main>
            {!results && !searching && (
              <section className="popular">
                <h3>Popular routes</h3>
                <div className="grid">
                  {POPULAR.map((p) => (
                    <button key={p.from + p.to} className="route-card" onClick={() => pickPopular(p)}>
                      <span className="emoji">{p.emoji}</span>
                      <strong>
                        {cityName(p.from)} → {cityName(p.to)}
                      </strong>
                      <small>starting {p.price}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {searching && (
              <div className="loader">
                <div className="plane">✈</div>
                <p>Best flights searching…</p>
              </div>
            )}

            {results && (
              <>
                <div className="result-head">
                  <h3>
                    {cityName(form.from)} → {cityName(form.to)}
                  </h3>
                  <span>
                    {form.date} · {form.passengers} passenger{form.passengers > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="filters">
                  <label>
                    Sort
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="price">Cheapest</option>
                      <option value="duration">Fastest</option>
                      <option value="departure">Earliest</option>
                    </select>
                  </label>
                  <label>
                    Airline
                    <select value={airlineFilter} onChange={(e) => setAirlineFilter(e.target.value)}>
                      {airlines.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={nonStop} onChange={(e) => setNonStop(e.target.checked)} />
                    Non-stop only
                  </label>
                  <span className="count">{visible.length} flights</span>
                </div>

                {visible.length === 0 && <p className="empty">Koi flight nahi mili. Filters change karke dekho.</p>}

                {visible.map((f, i) => (
                  <div className="flight" key={f.id} style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="airline">
                      <span className="badge" style={{ background: AIRLINE_COLORS[f.airline] || "#2b3a8c" }}>
                        {f.airline.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <strong>{f.airline}</strong>
                        <small>{f.number}</small>
                      </div>
                    </div>

                    <div className="route">
                      <div className="time">
                        <b>{f.departure}</b>
                        <small>{f.from}</small>
                      </div>
                      <div className="line">
                        <small>{hm(f.duration)}</small>
                        <div className="track">
                          <span className="dot" />
                          <span className="bar" />
                          <span className="fly">✈</span>
                          <span className="dot" />
                        </div>
                        <small className={f.stops === 0 ? "green" : "orange"}>
                          {f.stops === 0 ? "Non-stop" : "1 stop"}
                        </small>
                      </div>
                      <div className="time">
                        <b>{f.arrival}</b>
                        <small>{f.to}</small>
                      </div>
                    </div>

                    <div className="buy">
                      <div className="tags">
                        {f.id === cheapestId && <span className="tag t-green">Cheapest</span>}
                        {f.id === fastestId && <span className="tag t-blue">Fastest</span>}
                      </div>
                      <b className="amount">{inr(f.price)}</b>
                      <small>per person</small>
                      <button className="primary" onClick={() => setSelected(f)}>
                        Book now
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </main>
        </>
      )}

      {/* My Bookings: backend ka nested flight object padhta hai (flat ka fallback bhi) */}
      {tab === "bookings" && (
        <main className="page">
          <h3 className="page-title">My Bookings</h3>
          {bookings.length === 0 && (
            <div className="empty big-empty">
              <div>🧳</div>
              <p>Book and manage your flights with ease!</p>
              <button className="primary" onClick={() => setTab("search")}>
                Search flights
              </button>
            </div>
          )}
          {bookings.map((b) => {
            const fl = b.flight || {
              airline: b.airline,
              number: b.flightNumber,
              from: b.origin,
              to: b.destination,
              date: b.travelDate,
              departure: b.departure,
              arrival: b.arrival,
            };
            return (
              <div className="ticket" key={b.id}>
                <div className="ticket-main">
                  <div className="ticket-top">
                    <span className="badge" style={{ background: AIRLINE_COLORS[fl.airline] || "#2b3a8c" }}>
                      {(fl.airline || "IN").slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong>
                        {cityName(fl.from)} → {cityName(fl.to)}
                      </strong>
                      <small>
                        {fl.airline} {fl.number} · {fl.date}
                      </small>
                    </div>
                  </div>
                  <div className="ticket-info">
                    <div>
                      <small>Departure</small>
                      <b>{fl.departure}</b>
                    </div>
                    <div>
                      <small>Arrival</small>
                      <b>{fl.arrival}</b>
                    </div>
                    <div>
                      <small>Passenger</small>
                      <b>{b.name}</b>
                    </div>
                    <div>
                      <small>Seats</small>
                      <b>{b.passengers}</b>
                    </div>
                  </div>
                </div>
                <div className="ticket-stub">
                  <small>Booking ID</small>
                  <strong>{b.id}</strong>
                  <b className="amount">{inr(b.total)}</b>
                  <button className="danger" onClick={() => cancel(b.id)}>
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </main>
      )}

      {selected && (
        <BookingModal
          flight={selected}
          passengers={Number(form.passengers)}
          onClose={() => setSelected(null)}
          onConfirm={book}
        />
      )}

      {/* Confirmation popup: nested ya flat dono chalega */}
      {confirmation && (
        <div className="overlay" onClick={() => setConfirmation(null)}>
          <div className="modal success" onClick={(e) => e.stopPropagation()}>
            <div className="check-circle">✓</div>
            <h2>Booking confirmed!</h2>
            <p>
              Booking ID: <strong>{confirmation.id}</strong>
            </p>
            <p>
              {cityName(confirmation.flight?.from || confirmation.origin)} →{" "}
              {cityName(confirmation.flight?.to || confirmation.destination)} ·{" "}
              {confirmation.flight?.date || confirmation.travelDate}
            </p>
            <p className="total">
              Total paid: <b>{inr(confirmation.total)}</b>
            </p>
            <button
              className="primary"
              onClick={() => {
                setConfirmation(null);
                setTab("bookings");
              }}
            >
              View my bookings
            </button>
          </div>
        </div>
      )}

      <footer>Thank you for choosing FlightFinder!</footer>
    </div>
  );
}

function BookingModal({ flight, passengers, onClose, onConfirm }) {
  const [info, setInfo] = useState({ name: "", email: "", phone: "" });
  const total = flight.price * passengers;
  const valid = info.name.trim() && /\S+@\S+\.\S+/.test(info.email) && /^\d{10}$/.test(info.phone);

  const set = (k) => (e) => setInfo({ ...info, [k]: e.target.value });

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onConfirm(info);
        }}
      >
        <h2>Passenger details</h2>
        <div className="summary">
          <strong>
            {flight.from} → {flight.to}
          </strong>
          <small>
            {flight.airline} {flight.number} · {flight.date} · {flight.departure}
          </small>
        </div>
        <label>
          Full name
          <input value={info.name} onChange={set("name")} placeholder="Jaise: Vijay Kumar" required />
        </label>
        <label>
          Email
          <input type="email" value={info.email} onChange={set("email")} placeholder="you@example.com" required />
        </label>
        <label>
          Phone (10 digits)
          <input value={info.phone} onChange={set("phone")} maxLength={10} placeholder="9876543210" required />
        </label>
        <p className="total">
          {passengers} × {inr(flight.price)} = <b>{inr(total)}</b>
        </p>
        <div className="actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={!valid}>
            Confirm &amp; pay
          </button>
        </div>
      </form>
    </div>
  );
}